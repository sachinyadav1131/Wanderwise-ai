from ai_service.workflows.base_workflow import BaseWorkflow
from ai_service.agents.weather_agent import WeatherAgent
from ai_service.agents.companion_agent import CompanionAgent
from ai_service.agents.writer_agent import WriterAgent
from ai_service.schemas.domain import WorkflowState

class ChatWorkflow(BaseWorkflow):
    def __init__(self):
        super().__init__("ChatWorkflow")
        self.stages = ["collect_context", "weather", "companion", "writer"]
        
        self.weather_agent = WeatherAgent()
        self.companion_agent = CompanionAgent()
        self.writer_agent = WriterAgent()

    async def stage_collect_context(self, state: WorkflowState) -> WorkflowState:
        msg = state.context.get("message", "").lower()
        state.context["processed_msg"] = msg
        return state

    async def stage_weather(self, state: WorkflowState) -> WorkflowState:
        msg = state.context.get("processed_msg", "")
        if "rain" in msg or "weather" in msg:
            result = await self.weather_agent.run(state)
            state.context["weather_detour_applicable"] = True
            state.context["weather_result"] = result.details
        else:
            state.context["weather_detour_applicable"] = False
        return state

    async def stage_companion(self, state: WorkflowState) -> WorkflowState:
        result = await self.companion_agent.run(state)
        state.context["companion_result"] = result.details
        return state

    async def stage_writer(self, state: WorkflowState) -> WorkflowState:
        await self.writer_agent.run(state)
        
        msg = state.context.get("processed_msg", "")
        reply_text = "I am here to guide your trip! Tell me about weather changes, or ask to skip/reschedule any destinations."
        has_suggestion = False
        suggestion = None

        if state.context.get("weather_detour_applicable"):
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
        else:
            comp_res = state.context.get("companion_result") or {}
            reply_text = comp_res.get("replyText", reply_text)
            has_suggestion = comp_res.get("hasSuggestion", False)
            suggestion = comp_res.get("suggestion")

        state.context["output"] = {
            "replyText": reply_text,
            "hasSuggestion": has_suggestion,
            "suggestion": suggestion
        }
        return state
