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
        trip = state.tripDetails
        activities = state.activities

        import json
        from ai_service.services.llm_service import llm_service

        # Prompt instruction requesting structured json parsing for user modification intent
        system_instruction = (
            "You are a helpful travel companion AI. You analyze user messages against their current itinerary "
            "activities to check if they want to modify their plan (add, update/reschedule, or delete/cancel activities). "
            "Always respond with a raw JSON object matching the requested schema. No explanation or conversation preamble."
        )

        prompt = f"""You are assisting a traveler on their trip to '{trip.destination}'.
User Message: "{user_message}"

Current Itinerary Activities:
{json.dumps(activities, indent=2)}

Determine if the user is asking to modify their itinerary (e.g., cancel a stop, move an activity to another day/time, or insert a new activity).
If they are, set "hasSuggestion" to true and populate the "suggestion" object conforming to the schema below.
Otherwise, set "hasSuggestion" to false and "suggestion" to null.

Format your response EXACTLY as a JSON object matching this schema:
{{
  "replyText": "Explain what updates you proposed in a friendly way, or answer general questions.",
  "hasSuggestion": true,
  "suggestion": {{
    "triggerType": "Chat",
    "reason": "Brief reason for the suggestion (e.g., user request)",
    "generatedSummary": "Reschedule X to day Y",
    "estimatedBudgetImpact": 0.0,
    "estimatedTimeImpact": 0.0,
    "beforeSnapshot": {{
      "activities": [
        // List of affected activities in their current state before change
      ]
    }},
    "afterSnapshot": {{
      "activities": [
        // List of affected activities in their state after change
      ]
    }},
    "suggestedChanges": {{
      "activities": [
        // Array of changes to execute on database.
        // For ADD:
        // {{ "action": "ADD", "data": {{ "title": "Visit X", "location": "Location X", "dayNumber": 1, "timeSlot": "Morning", "time": "09:00 AM", "cost": 0, "estimatedDuration": 60 }} }}
        // For UPDATE:
        // {{ "action": "UPDATE", "activityId": "mongo_id_string_from_current_itinerary", "data": {{ "dayNumber": 2, "timeSlot": "Evening", "time": "06:00 PM" }} }}
        // For DELETE:
        // {{ "action": "DELETE", "activityId": "mongo_id_string_from_current_itinerary" }}
      ]
    }}
  }}
}}
"""

        try:
            response_text = await llm_service.generate_response(
                prompt=prompt,
                system_instruction=system_instruction,
                structured_json=True
            )
            
            cleaned_text = response_text.strip()
            if cleaned_text.startswith("```"):
                lines = cleaned_text.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].startswith("```"):
                    lines = lines[:-1]
                cleaned_text = "\n".join(lines).strip()
                
            data = json.loads(cleaned_text)
            reply_text = data.get("replyText") or "I can help you change your trip. Just let me know what to update!"
            has_suggestion = bool(data.get("hasSuggestion", False))
            suggestion = data.get("suggestion") if has_suggestion else None
        except Exception as e:
            logger.error(f"[CompanionAgent] Failed to parse LLM response: {e}")
            reply_text = "I'm here to guide your trip! You can tell me to reschedule, delete or add destinations anytime."
            has_suggestion = False
            suggestion = None

        if has_suggestion and suggestion:
            # ── MCP Tool Call: create_notification ────────────────────────
            try:
                await mcp_client.call_tool("create_notification", {
                    "trip_id": state.tripId,
                    "type": "in_app",
                    "title": "Itinerary Proposal Ready",
                    "message": f"AI proposed: \"{suggestion.get('generatedSummary')}\"",
                    "metadata": {
                        "source": "CompanionAgent",
                    },
                })
            except Exception:
                pass

        reasoning = (
            f"Processed chat query: '{user_message[:50]}...'. "
            f"LLM suggestion proposal: {has_suggestion}."
        )

        details = {
            "replyText": reply_text,
            "hasSuggestion": has_suggestion,
            "suggestion": suggestion,
        }

        # ── MCP Tool Call: store_agent_log ───────────────────────────────
        try:
            await mcp_client.call_tool("store_agent_log", {
                "trip_id": state.tripId,
                "agent_name": self.name,
                "action": "ChatResponse",
                "reasoning": reasoning,
                "details": details,
            })
        except Exception:
            pass

        return "ChatResponse", reasoning, details
