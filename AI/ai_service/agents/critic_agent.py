"""
CriticAgent — refactored for Phase 7.
Audits the assembled itinerary for safety, fatigue, and budget concerns.
Calls `create_notification` via MCP for any warnings found,
and `store_agent_log` to record the audit outcome.
"""
from ai_service.agents.base_agent import BaseAgent
from ai_service.schemas.domain import WorkflowState, AgentResult
from ai_service.mcp_server.client import mcp_client


class CriticAgent(BaseAgent):
    def __init__(self):
        super().__init__("CriticAgent")

    def validate_input(self, state: WorkflowState) -> bool:
        return True

    def validate_output(self, result: AgentResult) -> bool:
        return result.action == "AuditItinerary"

    async def _execute_logic(self, state: WorkflowState) -> tuple[str, str, dict | None]:
        trip = state.tripDetails
        warnings: list[str] = []

        # ── Audit: Budget cap ────────────────────────────────────────────
        budget_result = state.context.get("budget_result") or {}
        breakdown = budget_result.get("budgetBreakdown", {})
        if not breakdown.get("withinBudget", True):
            overspend = abs(breakdown.get("remaining", 0))
            warnings.append(
                f"Budget exceeded by ₹{overspend:.0f}. "
                "Consider cheaper hotel or fewer paid activities."
            )

        # ── Audit: Activity fatigue (>3 activities/day = overloaded) ─────
        route_result = state.context.get("route_result") or {}
        activities = route_result.get("activities", [])
        if len(activities) > 3:
            warnings.append(
                f"{len(activities)} activities scheduled in one day — may cause fatigue. "
                "Consider spreading across multiple days."
            )

        # ── Audit: Outdoor activity during rain ───────────────────────────
        weather_result = state.context.get("weather_result") or {}
        needs_detour = weather_result.get("needsDetour", False)
        if needs_detour:
            outdoor_count = sum(1 for a in activities if not a.get("isIndoor", False))
            if outdoor_count > 0:
                warnings.append(
                    f"{outdoor_count} outdoor activity(ies) remain despite rain advisory. "
                    "Consider replacing with indoor backups."
                )

        audit_passed = len(warnings) == 0

        # ── MCP Tool Call: create_notification for each warning ───────────
        for warning in warnings:
            await mcp_client.call_tool("create_notification", {
                "trip_id": state.tripId,
                "type": "in_app",
                "title": "Itinerary Audit Warning",
                "message": warning,
                "metadata": {"severity": "medium", "source": "CriticAgent"},
            })

        reasoning = (
            f"Audited itinerary for '{trip.destination}': "
            + (f"All checks passed." if audit_passed else f"{len(warnings)} warning(s) found: {warnings}")
        )

        details = {
            "auditPassed": audit_passed,
            "warnings": warnings,
            "activitiesReviewed": len(activities),
        }

        # ── MCP Tool Call: store_agent_log ───────────────────────────────
        await mcp_client.call_tool("store_agent_log", {
            "trip_id": state.tripId,
            "agent_name": self.name,
            "action": "AuditItinerary",
            "reasoning": reasoning,
            "details": details,
        })

        return "AuditItinerary", reasoning, details
