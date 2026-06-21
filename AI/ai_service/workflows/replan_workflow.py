class ReplanWorkflow:
    async def run(self, trip_id: str, trigger_type: str, reason: str, activities: list[dict], weather_alert_details: dict | None = None) -> dict:
        # Mock replan workflows simulating detours and alternative activity suggestions
        return {
            "generatedSummary": "Postpone Lodhi Garden visit and detour to Crafts Museum (Indoor) due to severe rain forecast.",
            "estimatedBudgetImpact": 0.0,
            "estimatedTimeImpact": 0.0,
            "beforeSnapshot": {
                "activities": [
                    {"title": "Visit Lodhi Garden", "location": "Lodhi Garden", "dayNumber": 1, "timeSlot": "Afternoon"}
                ]
            },
            "afterSnapshot": {
                "activities": [
                    {"title": "Visit Lodhi Garden", "location": "Lodhi Garden", "dayNumber": 2, "timeSlot": "Afternoon", "status": "Moved"},
                    {"title": "Visit Crafts Museum (Indoor)", "location": "Pragati Maidan", "dayNumber": 1, "timeSlot": "Afternoon", "isAlternative": True}
                ]
            },
            "suggestedChanges": {
                "activities": [
                    {"action": "ADD", "data": {"title": "Visit Crafts Museum (Indoor)", "location": "Pragati Maidan", "dayNumber": 1, "timeSlot": "Afternoon", "isAlternative": True}}
                ]
            }
        }
