from ai_service.workflows.base_workflow import BaseWorkflow
from ai_service.agents.weather_agent import WeatherAgent
from ai_service.agents.planner_agent import PlannerAgent
from ai_service.agents.budget_agent import BudgetAgent
from ai_service.agents.critic_agent import CriticAgent
from ai_service.agents.writer_agent import WriterAgent
from ai_service.schemas.domain import WorkflowState

class ReplanWorkflow(BaseWorkflow):
    def __init__(self):
        super().__init__("ReplanWorkflow")
        self.stages = [
            "collect_context",
            "weather",
            "planner",
            "budget",
            "critic",
            "writer"
        ]
        
        self.weather_agent = WeatherAgent()
        self.planner_agent = PlannerAgent()
        self.budget_agent = BudgetAgent()
        self.critic_agent = CriticAgent()
        self.writer_agent = WriterAgent()

    async def stage_collect_context(self, state: WorkflowState) -> WorkflowState:
        return state

    async def stage_weather(self, state: WorkflowState) -> WorkflowState:
        if state.context.get("triggerType") == "Weather":
            await self.weather_agent.run(state)
        return state

    async def stage_planner(self, state: WorkflowState) -> WorkflowState:
        await self.planner_agent.run(state)
        return state

    async def stage_budget(self, state: WorkflowState) -> WorkflowState:
        await self.budget_agent.run(state)
        return state

    async def stage_critic(self, state: WorkflowState) -> WorkflowState:
        await self.critic_agent.run(state)
        return state

    async def stage_writer(self, state: WorkflowState) -> WorkflowState:
        await self.writer_agent.run(state)
        
        state.context["output"] = {
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
        return state
