"""
CompanionAgent — refactored for Phase 7 + Phase 8.
Processes user chat messages and:
  1. Detects expense-logging intent ("add 200 rs for food today") and records
     the expense in the SQLite ledger via the AI service expense endpoint.
  2. Handles weather queries via MCP check_weather tool.
  3. Detects itinerary-modification intent and produces structured suggestions.
  4. Calls `store_agent_log` to record its response rationale.
"""
import datetime
import re
from ai_service.agents.base_agent import BaseAgent
from ai_service.schemas.domain import WorkflowState, AgentResult
from ai_service.mcp_server.client import mcp_client
from ai_service import expense_db

# Keywords that indicate the user wants to trigger a plan change
_REPLAN_KEYWORDS = {"rain", "weather", "cancel", "skip", "change", "reschedule", "replace", "indoor"}

# Expense category map from common keywords
_CATEGORY_MAP = {
    "food": "Food", "lunch": "Food", "dinner": "Food", "breakfast": "Food",
    "snack": "Food", "meal": "Food", "restaurant": "Food", "cafe": "Food",
    "coffee": "Food", "drink": "Food", "eat": "Food",
    "cab": "Transport", "auto": "Transport", "taxi": "Transport", "uber": "Transport",
    "ola": "Transport", "metro": "Transport", "bus": "Transport", "train": "Transport",
    "transport": "Transport", "travel": "Transport", "ride": "Transport",
    "ticket": "Attractions", "entry": "Attractions", "museum": "Attractions",
    "attraction": "Attractions", "tour": "Attractions",
    "hotel": "Stay", "stay": "Stay", "hostel": "Stay", "accommodation": "Stay",
    "shopping": "Shopping", "shop": "Shopping", "souvenir": "Shopping", "buy": "Shopping",
    "misc": "Miscellaneous", "other": "Miscellaneous", "general": "Miscellaneous",
}


def _detect_expense_intent(message: str) -> dict | None:
    """
    Detect if the message is an expense-logging request.
    Patterns:
      "add 200 rs for food today"
      "spent 500 on transport yesterday"
      "log 150 for lunch on 2026-08-05"
      "add ₹300 for cab"
    Returns dict with {amount, category, date, note} or None.
    """
    msg = message.lower().strip()

    # Quick filter — must mention money or expense verbs
    expense_verbs = r"(?:add|log|record|spent|spend|paid|pay|expense|track)"
    money_pattern = r"(?:rs\.?|inr|₹|rupees?)?\s*(\d+(?:\.\d{1,2})?)\s*(?:rs\.?|inr|₹|rupees?)?"
    if not re.search(expense_verbs, msg):
        return None
    amount_match = re.search(money_pattern, msg)
    if not amount_match:
        return None

    amount = float(amount_match.group(1))

    # Determine category
    category = "Miscellaneous"
    for keyword, cat in _CATEGORY_MAP.items():
        if keyword in msg:
            category = cat
            break

    # Determine date
    today = datetime.date.today()
    if "yesterday" in msg:
        date = (today - datetime.timedelta(days=1)).isoformat()
    elif "today" in msg:
        date = today.isoformat()
    else:
        # Look for explicit date like "2026-08-05" or "05 aug" etc.
        date_match = re.search(r"(\d{4}-\d{2}-\d{2})", msg)
        if date_match:
            date = date_match.group(1)
        else:
            date = today.isoformat()

    # Extract note (text after "for" or "on")
    note_match = re.search(r"for\s+(.+?)(?:\s+(?:today|yesterday|on\s+\d)|\s*$)", msg)
    note = note_match.group(1).strip() if note_match else category.lower()

    return {"amount": amount, "category": category, "date": date, "note": note}


class CompanionAgent(BaseAgent):
    def __init__(self):
        super().__init__("CompanionAgent")

    def validate_input(self, state: WorkflowState) -> bool:
        return True

    def validate_output(self, result: AgentResult) -> bool:
        return result.action == "ChatResponse"

    async def _execute_logic(self, state: WorkflowState) -> tuple[str, str, dict | None]:
        user_message: str = state.context.get("message", "")
        rejected_suggestions: list[str] = state.context.get("rejectedSuggestions", [])
        trip = state.tripDetails
        activities = state.activities

        import json
        from ai_service.services.llm_service import llm_service

        # ── 1. Expense Intent Interception ─────────────────────────────────────
        expense_intent = _detect_expense_intent(user_message)
        if expense_intent:
            try:
                result = expense_db.add_expense(
                    trip_id=state.tripId,
                    date=expense_intent["date"],
                    amount=expense_intent["amount"],
                    category=expense_intent["category"],
                    note=expense_intent["note"],
                )
                reply_text = (
                    f"✅ Got it! I've logged **₹{expense_intent['amount']}** for "
                    f"**{expense_intent['category']}** on {expense_intent['date']}. "
                    f"Your budget tracker has been updated. "
                    f"Use the budget widget to see your live spending progress. 💰"
                )
                details = {
                    "replyText": reply_text,
                    "hasSuggestion": False,
                    "suggestion": None,
                    "expenseLogged": result,
                }
                await mcp_client.call_tool("store_agent_log", {
                    "trip_id": state.tripId,
                    "agent_name": self.name,
                    "action": "ChatResponse",
                    "reasoning": f"Expense intent detected: ₹{expense_intent['amount']} for {expense_intent['category']}",
                    "details": details,
                })
                return "ChatResponse", f"Logged expense ₹{expense_intent['amount']}", details
            except Exception as e:
                reply_text = f"⚠️ I understood you want to log an expense but ran into an issue: {str(e)}. Please try again!"
                return "ChatResponse", "Expense logging failed", {
                    "replyText": reply_text,
                    "hasSuggestion": False,
                    "suggestion": None,
                }

        # ── 2. Weather Query Interception ──────────────────────────────────────
        is_weather_query = any(w in user_message.lower() for w in [
            "weather", "temperature", "temp", "rain", "forecast", "climate", "degree", "cold", "hot"
        ])

        weather_context = ""
        if is_weather_query:
            try:
                extract_instruction = (
                    "You are a location extraction utility. Read the user message and extract the name of the city "
                    "or location they are asking about. Return ONLY the city/location name, capitalized, with no other text, punctuation, or explanation. "
                    f"If they do not mention a specific city or location, return exactly '{trip.destination}'."
                )
                extracted_city = await llm_service.generate_response(
                    prompt=f"User Message: \"{user_message}\"",
                    system_instruction=extract_instruction,
                    structured_json=False
                )
                target_city = extracted_city.strip().strip('"').strip("'")
                if not target_city:
                    target_city = trip.destination
            except Exception:
                target_city = trip.destination

            try:
                date_str = trip.startDate.split("T")[0] if isinstance(trip.startDate, str) else trip.startDate.strftime("%Y-%m-%d")
            except Exception:
                date_str = datetime.date.today().isoformat()

            try:
                weather_data = await mcp_client.call_tool("check_weather", {
                    "location": target_city,
                    "date": date_str
                })
            except Exception as e:
                weather_data = {"error": str(e), "message": "Failed to fetch live weather details."}

            weather_context = f"""
            The user is asking about the weather. We have fetched the real-time weather details for {target_city}:
            {json.dumps(weather_data, indent=2)}
            
            Based on this weather data, formulate a friendly reply detailing the weather (temperature, conditions, baseline comparison, and abnormal alerts if any).
            IMPORTANT: Since the user is just asking for a weather update, do NOT propose any itinerary changes (set "hasSuggestion" to false and "suggestion" to null).
            """

        rejected_prompt = ""
        if rejected_suggestions:
            rejected_prompt = "Previously REJECTED Plan Modifications:\n"
            for plan in rejected_suggestions:
                rejected_prompt += f"- {plan}\n"
            rejected_prompt += (
                "\nCRITICAL RULE: AVOID proposing any of the above plans again, unless the user's message "
                "explicitly requests or refers to doing one of those rejected plans again (e.g. they changed their mind "
                "and now want to apply it anyway)."
            )

        # ── 3. General Itinerary / Q&A via LLM ────────────────────────────────
        system_instruction = (
            "You are a helpful travel companion AI. You analyze user messages against their current itinerary "
            "activities to check if they want to modify their plan (add, update/reschedule, or delete/cancel activities). "
            "Always respond with a raw JSON object matching the requested schema. No explanation or conversation preamble."
        )

        prompt = f"""You are assisting a traveler on their trip to '{trip.destination}'.
User Message: "{user_message}"

Current Itinerary Activities:
{json.dumps(activities, indent=2)}

{weather_context}

Determine if the user is asking to modify their itinerary (e.g., cancel a stop, move an activity to another day/time, or insert a new activity).
If they are, set "hasSuggestion" to true and populate the "suggestion" object conforming to the schema below.
Otherwise, set "hasSuggestion" to false and "suggestion" to null.

CRITICAL RULE FOR COLLISIONS: There can only be ONE primary activity per time slot (Morning, Afternoon, Evening) for a given day. 
If you move or add an activity to a slot that already has an existing activity, you MUST explicitly generate an additional UPDATE or DELETE action to either move the existing activity to another slot (swap) or drop it completely. DO NOT leave two activities in the same time slot on the same day!

{rejected_prompt}

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
