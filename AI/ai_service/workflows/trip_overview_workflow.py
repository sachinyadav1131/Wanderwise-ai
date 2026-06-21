from ai_service.workflows.base_workflow import BaseWorkflow
from ai_service.agents.planner_agent import PlannerAgent
from ai_service.agents.stay_agent import StayAgent
from ai_service.agents.critic_agent import CriticAgent
from ai_service.agents.writer_agent import WriterAgent
from ai_service.schemas.domain import WorkflowState

class TripOverviewWorkflow(BaseWorkflow):
    def __init__(self):
        super().__init__("TripOverviewWorkflow")
        self.stages = ["collect_context", "planner", "stay", "critic", "writer"]
        
        self.planner_agent = PlannerAgent()
        self.stay_agent = StayAgent()
        self.critic_agent = CriticAgent()
        self.writer_agent = WriterAgent()

    async def stage_collect_context(self, state: WorkflowState) -> WorkflowState:
        state.context["destination"] = state.tripDetails.destination
        return state

    async def stage_planner(self, state: WorkflowState) -> WorkflowState:
        result = await self.planner_agent.run(state)
        state.context["planner_result"] = result.details
        return state

    async def stage_stay(self, state: WorkflowState) -> WorkflowState:
        result = await self.stay_agent.run(state)
        state.context["stay_result"] = result.details
        return state

    async def stage_critic(self, state: WorkflowState) -> WorkflowState:
        result = await self.critic_agent.run(state)
        state.context["critic_result"] = result.details
        return state

    async def stage_writer(self, state: WorkflowState) -> WorkflowState:
        await self.writer_agent.run(state)
        
        planner_details = state.context.get("planner_result") or {}
        stay_details = state.context.get("stay_result") or {}
        
        high_level_plan = planner_details.get("highLevelPlan") or [
            {
                "dayNumber": 1,
                "summary": f"Day 1: Highlights of {state.tripDetails.destination}",
                "staySuggestion": "Smyle Inn Hostel"
            }
        ]

        state.context["output"] = {
            "destination": state.tripDetails.destination,
            "durationDays": 1,
            "recommendedStayArea": stay_details.get("staySuggestion", {}).get("locationArea", "Connaught Place/Paharganj"),
            "stayRationale": "Central location, highly connected via metro, and budget-friendly hostel options.",
            "highLevelPlan": high_level_plan
        }
        return state
