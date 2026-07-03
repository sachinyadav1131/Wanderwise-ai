import json
import logging
from ai_service.workflows.base_workflow import BaseWorkflow
from ai_service.agents.weather_agent import WeatherAgent
from ai_service.agents.planner_agent import PlannerAgent
from ai_service.agents.budget_agent import BudgetAgent
from ai_service.agents.critic_agent import CriticAgent
from ai_service.agents.writer_agent import WriterAgent
from ai_service.schemas.domain import WorkflowState
from ai_service.services.llm_service import llm_service

logger = logging.getLogger("workflow.replan")

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
        # PlannerAgent can run default logic if needed, but we bypass for custom LLM re-routing
        return state

    async def stage_budget(self, state: WorkflowState) -> WorkflowState:
        return state

    async def stage_critic(self, state: WorkflowState) -> WorkflowState:
        return state

    async def stage_writer(self, state: WorkflowState) -> WorkflowState:
        # Generate dynamic replan changes using LLM based on weather details
        activities = state.activities
        alert_reason = state.context.get("reason") or "Severe weather alert."
        destination = state.tripDetails.destination
        
        prompt = f"""
        You are a travel itinerary replanning assistant.
        A trip to {destination} has encountered a weather alert:
        Alert Reason: {alert_reason}

        Here are the current planned activities for this trip:
        {json.dumps(activities, indent=2)}

        Tasks:
        1. Identify any outdoor activities scheduled for Day 1 (the day of the weather warning) that will be affected by this weather (extreme heat/cold or rain).
        2. Propose a detour:
           - Move/postpone the affected outdoor activities to a subsequent day (e.g. if the trip is multi-day, shift them to Day 2 or Day 3). If it's a 1-day trip, mark their status as "Skipped" or "Moved".
           - Add a new indoor alternative activity (e.g. museum, indoor center) in the same time slot on Day 1 to replace the outdoor activity. Choose a popular real indoor attraction in {destination}.
        3. Formulate the changes in JSON format containing:
           - "generatedSummary": A clear explanation of what is being changed and why (e.g. 'Postpone India Gate visit to Day 2 and detour to National Museum today due to extreme heat of 50°C.').
           - "estimatedBudgetImpact": Estimated change in cost (new activity cost minus old activity cost, e.g. 50.0).
           - "estimatedTimeImpact": Change in duration (usually 0.0).
           - "beforeSnapshot": {{ "activities": [...] }} -> The original state of ONLY the affected/modified activities.
           - "afterSnapshot": {{ "activities": [...] }} -> The updated state of the modified activities AND the new indoor activity (marked with "isAlternative": true, "status": "Pending").
           - "suggestedChanges": {{ "activities": [ {{"action": "UPDATE", "activityId": "...", "data": {{...}}}}, {{"action": "ADD", "data": {{...}}}} ] }}
             Note: for UPDATE actions, provide the activityId and the data keys that changed (e.g., status, dayNumber). For ADD actions, provide the full activity data (title, location, description, timeSlot, time, cost, estimatedDuration, dayNumber, isAlternative=True).

        Ensure all activity IDs match exactly from the input list.
        Do NOT wrap the output in markdown block. Return raw valid JSON.
        """
        
        try:
            llm_response = await llm_service.generate_response(
                prompt=prompt,
                system_instruction="You are a travel replanning assistant. Always reply with raw valid JSON matching the requested schema. No conversational preamble.",
                structured_json=True
            )
            
            # Clean response text
            cleaned_text = llm_response.strip()
            if cleaned_text.startswith("```"):
                lines = cleaned_text.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].startswith("```"):
                    lines = lines[:-1]
                cleaned_text = "\n".join(lines).strip()
                
            data = json.loads(cleaned_text)
            state.context["output"] = {
                "generatedSummary": data.get("generatedSummary", f"Weather detour generated: {alert_reason}"),
                "estimatedBudgetImpact": float(data.get("estimatedBudgetImpact", 0.0)),
                "estimatedTimeImpact": float(data.get("estimatedTimeImpact", 0.0)),
                "beforeSnapshot": data.get("beforeSnapshot", {"activities": []}),
                "afterSnapshot": data.get("afterSnapshot", {"activities": []}),
                "suggestedChanges": data.get("suggestedChanges", {"activities": []})
            }
        except Exception as e:
            logger.error(f"Dynamic replanning failed: {e}. Falling back to default detour.")
            # Safety fallback values
            first_outdoor = next((act for act in activities if act.get("dayNumber") == 1), None)
            before_act = [first_outdoor] if first_outdoor else []
            after_act = []
            suggested = []
            
            if first_outdoor:
                after_act.append({**first_outdoor, "status": "Moved", "dayNumber": 2})
                suggested.append({"action": "UPDATE", "activityId": first_outdoor.get("_id"), "data": {"status": "Moved", "dayNumber": 2}})
                
            after_act.append({
                "title": f"Visit {destination} Indoor Museum",
                "description": "Weather backup alternative.",
                "dayNumber": 1,
                "timeSlot": "Afternoon",
                "time": "02:00 PM",
                "location": destination,
                "cost": 50,
                "estimatedDuration": 120,
                "isAlternative": True,
                "status": "Pending"
            })
            
            suggested.append({
                "action": "ADD",
                "data": {
                    "title": f"Visit {destination} Indoor Museum",
                    "description": "Weather backup alternative.",
                    "dayNumber": 1,
                    "timeSlot": "Afternoon",
                    "time": "02:00 PM",
                    "location": destination,
                    "cost": 50,
                    "estimatedDuration": 120,
                    "isAlternative": True,
                    "status": "Pending"
                }
            })
            
            state.context["output"] = {
                "generatedSummary": f"Postpone outdoor activity and detour to an indoor alternative due to weather conditions: {alert_reason}",
                "estimatedBudgetImpact": 50.0,
                "estimatedTimeImpact": 0.0,
                "beforeSnapshot": {"activities": before_act},
                "afterSnapshot": {"activities": after_act},
                "suggestedChanges": {"activities": suggested}
            }

        return state
