"""
CompanionAgent — refactored for Phase 7.
Processes user chat messages and calls `create_notification` via MCP
when a significant user intent (replan, weather, skip) is detected.
Also calls `store_agent_log` to record its response rationale.
"""
from ai_service.agents.base_agent import BaseAgent
from ai_service.schemas.domain import WorkflowState, AgentResult
from ai_service.mcp_server.client import mcp_client

# Keywords that indicate the user wants to trigger a plan change
_REPLAN_KEYWORDS = {"rain", "weather", "cancel", "skip", "change", "reschedule", "replace", "indoor"}


class CompanionAgent(BaseAgent):
    def __init__(self):
        super().__init__("CompanionAgent")

    def validate_input(self, state: WorkflowState) -> bool:
        return True

    def validate_output(self, result: AgentResult) -> bool:
        return result.action == "ChatResponse"

    async def _execute_logic(self, state: WorkflowState) -> tuple[str, str, dict | None]:
        user_message: str = state.context.get("message", "")
        tokens = set(user_message.lower().split())

        # Detect intent from keywords
        matched_keywords = _REPLAN_KEYWORDS & tokens
        has_replan_intent = len(matched_keywords) > 0

        if has_replan_intent:
            reply_text = (
                "I've detected a change request in your message. "
                "I'm checking the situation and will propose updated plans shortly! "
                f"(Triggered by: {', '.join(matched_keywords)})"
            )
            suggestion = {
                "action": "REPLAN",
                "reason": f"User message indicates intent: {', '.join(matched_keywords)}",
            }

            # ── MCP Tool Call: create_notification ────────────────────────
            await mcp_client.call_tool("create_notification", {
                "trip_id": state.tripId,
                "type": "in_app",
                "title": "Trip Change Request Detected",
                "message": f"Your companion AI detected a change request: \"{user_message[:120]}\"",
                "metadata": {
                    "triggeredBy": list(matched_keywords),
                    "source": "CompanionAgent",
                },
            })
        else:
            reply_text = (
                "I'm here to guide your trip! You can tell me about weather changes, "
                "ask to skip destinations, or request indoor alternatives anytime."
            )
            suggestion = None

        reasoning = (
            f"Processed user message. "
            + (f"Detected replan intent from: {matched_keywords}." if has_replan_intent
               else "No significant change intent detected.")
        )

        details = {
            "replyText": reply_text,
            "hasSuggestion": has_replan_intent,
            "suggestion": suggestion,
            "detectedKeywords": list(matched_keywords),
        }

        # ── MCP Tool Call: store_agent_log ───────────────────────────────
        await mcp_client.call_tool("store_agent_log", {
            "trip_id": state.tripId,
            "agent_name": self.name,
            "action": "ChatResponse",
            "reasoning": reasoning,
            "details": details,
        })

        return "ChatResponse", reasoning, details
