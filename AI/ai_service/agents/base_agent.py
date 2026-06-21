from abc import ABC, abstractmethod
import logging
from ai_service.schemas.domain import WorkflowState, AgentResult
from ai_service.services.llm_service import llm_service

class BaseAgent(ABC):
    def __init__(self, name: str):
        self.name = name
        self.logger = logging.getLogger(self.name)

    @abstractmethod
    def validate_input(self, state: WorkflowState) -> bool:
        """Validates that input blackboard state context meets preconditions."""
        pass

    @abstractmethod
    def validate_output(self, result: AgentResult) -> bool:
        """Validates that agent outcome conforms to schemas and postconditions."""
        pass

    @abstractmethod
    async def _execute_logic(self, state: WorkflowState) -> tuple[str, str, dict | None]:
        """
        Subclasses implement actual mock agent operations here.
        Returns a tuple: (action, reasoning, details)
        """
        pass

    def log_execution(self, state: WorkflowState, result: AgentResult):
        # Structured logger outputs tracking correlation IDs
        self.logger.info(
            f"[Trace: {state.trace_id}] Agent {self.name} executed action: {result.action} - "
            f"Reasoning: {result.reasoning[:120]}..."
        )

    def handle_failure(self, state: WorkflowState, error: Exception) -> AgentResult:
        self.logger.error(f"[Trace: {state.trace_id}] Agent {self.name} failed execution: {str(error)}")
        return AgentResult(
            tripId=state.tripId,
            agentName=self.name,
            action="ErrorRecovery",
            reasoning=f"Agent encountered error: {str(error)}. Triggering fallback.",
            details={"error": str(error)}
        )

    async def run(self, state: WorkflowState) -> AgentResult:
        if not self.validate_input(state):
            raise ValueError(f"Agent {self.name} input validation failed.")

        try:
            # Under the hood, base agent logic will use LLMService calls
            # (Ready for Phase 7 LLM integrations)
            # llm_res = await llm_service.generate_response(prompt="...")
            
            action, reasoning, details = await self._execute_logic(state)
            
            result = AgentResult(
                tripId=state.tripId,
                agentName=self.name,
                action=action,
                reasoning=reasoning,
                details=details
            )

            if not self.validate_output(result):
                raise ValueError(f"Agent {self.name} output validation failed.")

            self.log_execution(state, result)
            return result
        except Exception as e:
            return self.handle_failure(state, e)
