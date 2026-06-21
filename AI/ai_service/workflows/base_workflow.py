import time
import uuid
import logging
from typing import Any, List
from ai_service.schemas.domain import WorkflowState

class BaseWorkflow:
    def __init__(self, name: str):
        self.name = name
        self.logger = logging.getLogger(self.name)
        # Default stages for standard workflows. Subclasses should override self.stages.
        self.stages: List[str] = []

    def initialize_state(self, trip_id: str, trip_details: Any, **kwargs) -> WorkflowState:
        """
        Initializes the state for execution, assigning a unique trace_id if not present.
        """
        from ai_service.schemas.domain import WorkflowState, TripRequest
        trace_id = kwargs.get("trace_id") or f"TRACE-{uuid.uuid4().hex[:8]}"
        
        if not isinstance(trip_details, TripRequest) and isinstance(trip_details, dict):
            trip_details = TripRequest(**trip_details)
            
        state = WorkflowState(
            tripId=trip_id,
            tripDetails=trip_details,
            chatHistory=kwargs.get("chatHistory") or [],
            activities=kwargs.get("activities") or [],
            currentProgress=kwargs.get("currentProgress", 0.0),
            trace_id=trace_id,
            context=kwargs.get("context") or {}
        )
        self.logger.info(f"[Trace: {state.trace_id}] Initialized state for workflow '{self.name}' (Trip ID: {trip_id})")
        return state

    async def execute_stage(self, stage_name: str, state: WorkflowState) -> WorkflowState:
        """
        Executes a single stage in the pipeline.
        Measures execution latency, tracks structured logs, and implements error recovery hooks.
        """
        self.logger.info(f"[Trace: {state.trace_id}] Starting stage: '{stage_name}' in workflow '{self.name}'")
        start_time = time.perf_counter()
        
        try:
            stage_method_name = f"stage_{stage_name}"
            if hasattr(self, stage_method_name):
                method = getattr(self, stage_method_name)
                state = await method(state)
            else:
                self.logger.warning(f"[Trace: {state.trace_id}] Stage handler '{stage_method_name}' not defined, skipping.")
            
            latency_ms = (time.perf_counter() - start_time) * 1000.0
            self.logger.info(f"[Trace: {state.trace_id}] Completed stage: '{stage_name}' in {latency_ms:.2f}ms")
        except Exception as e:
            self.logger.error(f"[Trace: {state.trace_id}] Stage '{stage_name}' failed with error: {str(e)}")
            state = await self.handle_stage_failure(stage_name, state, e)
            
        return state

    async def handle_stage_failure(self, stage_name: str, state: WorkflowState, error: Exception) -> WorkflowState:
        """
        Error recovery hook for stages. Subclasses can override.
        """
        self.logger.warning(f"[Trace: {state.trace_id}] Recovering from failure in stage '{stage_name}'")
        if "errors" not in state.context:
            state.context["errors"] = {}
        state.context["errors"][stage_name] = str(error)
        return state

    async def execute(self, state: WorkflowState) -> WorkflowState:
        """
        Executes the entire stage pipeline in sequence.
        """
        self.logger.info(f"[Trace: {state.trace_id}] Executing workflow '{self.name}' with stages: {self.stages}")
        workflow_start = time.perf_counter()
        
        for stage in self.stages:
            state = await self.execute_stage(stage, state)
            
        total_time_ms = (time.perf_counter() - workflow_start) * 1000.0
        self.logger.info(f"[Trace: {state.trace_id}] Finished workflow '{self.name}' in {total_time_ms:.2f}ms")
        
        state = await self.finalize(state)
        return state

    async def finalize(self, state: WorkflowState) -> WorkflowState:
        """
        Post-execution finalizing step.
        """
        self.logger.info(f"[Trace: {state.trace_id}] Finalizing workflow '{self.name}'")
        return state
