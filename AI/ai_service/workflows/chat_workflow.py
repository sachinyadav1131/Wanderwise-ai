from ai_service.workflows.base_workflow import BaseWorkflow
from ai_service.agents.companion_agent import CompanionAgent
from ai_service.agents.writer_agent import WriterAgent
from ai_service.schemas.domain import WorkflowState

class ChatWorkflow(BaseWorkflow):
    def __init__(self):
        super().__init__("ChatWorkflow")
        # Keep stages strictly focused on dynamic companion agent and writer assembly
        self.stages = ["collect_context", "companion", "writer"]
        
        self.companion_agent = CompanionAgent()
        self.writer_agent = WriterAgent()

    async def stage_collect_context(self, state: WorkflowState) -> WorkflowState:
        msg = state.context.get("message", "").lower()
        state.context["processed_msg"] = msg
        return state

    async def stage_companion(self, state: WorkflowState) -> WorkflowState:
        result = await self.companion_agent.run(state)
        state.context["companion_result"] = result.details
        return state

    async def stage_writer(self, state: WorkflowState) -> WorkflowState:
        await self.writer_agent.run(state)
        
        reply_text = "I am here to guide your trip! Ask me about the weather, or request to skip/reschedule any activities."
        has_suggestion = False
        suggestion = None

        # Fetch outputs generated dynamically by CompanionAgent
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
