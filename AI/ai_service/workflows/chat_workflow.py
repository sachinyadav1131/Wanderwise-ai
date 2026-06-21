from ai_service.schemas.domain import WorkflowState

class ChatWorkflow:
    async def run(self, state: WorkflowState, message: str) -> dict:
        msg = message.lower()
        reply_text = "I am here to guide your trip! Tell me about weather changes, or ask to skip/reschedule any destinations."
        has_suggestion = False
        suggestion = None

        # Scenario A: Weather detours
        if "rain" in msg or "weather" in msg:
            has_suggestion = True
            reply_text = "It looks like heavy rain is expected. I suggest visiting the indoor National Museum today instead of India Gate, and postponing India Gate. Do you want to apply this update?"
            suggestion = {
                "triggerType": "Weather",
                "reason": "Precipitation warning. Redirecting to indoor Museum.",
                "generatedSummary": "Move India Gate to tomorrow and visit the indoor National Museum today.",
                "estimatedBudgetImpact": 20.0,
                "estimatedTimeImpact": 30.0,
                "beforeSnapshot": {
                    "activities": [
                        {"title": "Visit India Gate", "location": "India Gate", "dayNumber": 1, "timeSlot": "Morning"}
                    ]
                },
                "afterSnapshot": {
                    "activities": [
                        {"title": "Visit India Gate", "location": "India Gate", "dayNumber": 2, "timeSlot": "Morning", "status": "Moved"},
                        {"title": "Visit National Museum", "location": "National Museum, Janpath", "dayNumber": 1, "timeSlot": "Afternoon", "isAlternative": True}
                    ]
                },
                "suggestedChanges": {
                    "activities": [
                        {"action": "ADD", "data": {"title": "Visit National Museum", "location": "National Museum, Janpath", "dayNumber": 1, "timeSlot": "Afternoon", "isAlternative": True}}
                    ]
                }
            }
        
        # Scenario B: Reschedule / Move activity
        elif "india gate" in msg and ("move" in msg or "don't want" in msg):
            has_suggestion = True
            reply_text = "I can reschedule India Gate to tomorrow evening at 6:00 PM. Would you like to confirm?"
            suggestion = {
                "triggerType": "Chat",
                "reason": "User requested rescheduled India Gate.",
                "generatedSummary": "Reschedule India Gate visit to tomorrow evening.",
                "estimatedBudgetImpact": 0.0,
                "estimatedTimeImpact": 0.0,
                "beforeSnapshot": {
                    "activities": [
                        {"title": "Visit India Gate", "location": "India Gate", "dayNumber": 1, "timeSlot": "Morning"}
                    ]
                },
                "afterSnapshot": {
                    "activities": [
                        {"title": "Visit India Gate", "location": "India Gate", "dayNumber": 2, "timeSlot": "Evening", "time": "06:00 PM"}
                    ]
                },
                "suggestedChanges": {
                    "activities": [
                        {"action": "UPDATE", "data": {"dayNumber": 2, "timeSlot": "Evening", "time": "06:00 PM"}}
                    ]
                }
            }

        return {
            "replyText": reply_text,
            "hasSuggestion": has_suggestion,
            "suggestion": suggestion
        }
