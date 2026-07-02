from ai_service.workflows.base_workflow import BaseWorkflow
from ai_service.agents.planner_agent import PlannerAgent
from ai_service.agents.route_agent import RouteAgent
from ai_service.agents.stay_agent import StayAgent
from ai_service.agents.food_agent import FoodAgent
from ai_service.agents.budget_agent import BudgetAgent
from ai_service.agents.critic_agent import CriticAgent
from ai_service.agents.writer_agent import WriterAgent
from ai_service.schemas.domain import WorkflowState

class DetailedItineraryWorkflow(BaseWorkflow):
    def __init__(self):
        super().__init__("DetailedItineraryWorkflow")
        self.stages = [
            "collect_context",
            "planner",
            "route",
            "stay",
            "food",
            "budget",
            "critic",
            "writer"
        ]
        
        self.planner_agent = PlannerAgent()
        self.route_agent = RouteAgent()
        self.stay_agent = StayAgent()
        self.food_agent = FoodAgent()
        self.budget_agent = BudgetAgent()
        self.critic_agent = CriticAgent()
        self.writer_agent = WriterAgent()

    async def stage_collect_context(self, state: WorkflowState) -> WorkflowState:
        state.context["destination"] = state.tripDetails.destination
        return state

    async def stage_planner(self, state: WorkflowState) -> WorkflowState:
        result = await self.planner_agent.run(state)
        state.context["planner_result"] = result.details
        return state

    async def stage_route(self, state: WorkflowState) -> WorkflowState:
        result = await self.route_agent.run(state)
        state.context["route_result"] = result.details
        return state

    async def stage_stay(self, state: WorkflowState) -> WorkflowState:
        result = await self.stay_agent.run(state)
        state.context["stay_result"] = result.details
        return state

    async def stage_food(self, state: WorkflowState) -> WorkflowState:
        result = await self.food_agent.run(state)
        state.context["food_result"] = result.details
        return state

    async def stage_budget(self, state: WorkflowState) -> WorkflowState:
        result = await self.budget_agent.run(state)
        state.context["budget_result"] = result.details
        return state

    async def stage_critic(self, state: WorkflowState) -> WorkflowState:
        result = await self.critic_agent.run(state)
        state.context["critic_result"] = result.details
        return state

    async def stage_writer(self, state: WorkflowState) -> WorkflowState:
        await self.writer_agent.run(state)
        
        route_details = state.context.get("route_result") or {}
        stay_details = state.context.get("stay_result") or {}
        food_details = state.context.get("food_result") or {}
        
        activities_by_day = route_details.get("activitiesByDay") or {}
        food_by_day = food_details.get("foodSuggestionsByDay") or {}

        fallback_activities = route_details.get("activities", [
            {
                "title": "Visit India Gate",
                "timeSlot": "Morning",
                "time": "09:00 AM",
                "location": "India Gate",
                "cost": 0,
                "estimatedDuration": 60
            }
        ])
        
        fallback_food = food_details.get("foodSuggestions", [
            {
                "mealType": "Lunch",
                "restaurantName": "Khan Chacha",
                "cuisineType": "Mughlai",
                "averagePrice": 300
            }
        ])
        
        stay_suggestion = stay_details.get("staySuggestion", {
            "locationArea": "Connaught Place/Paharganj",
            "options": [
                {
                    "name": "Smyle Inn Hostel",
                    "pricePerNight": 950,
                    "type": "Hostel"
                }
            ]
        })

        from datetime import datetime, timedelta
        try:
            start_date = datetime.strptime(state.tripDetails.startDate.split("T")[0], "%Y-%m-%d")
            end_date = datetime.strptime(state.tripDetails.endDate.split("T")[0], "%Y-%m-%d")
            total_days = max((end_date - start_date).days + 1, 1)
        except Exception:
            total_days = 1
            start_date = datetime.now()

        day_dates = [(start_date + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(total_days)]
        itinerary_days = []

        for i in range(total_days):
            day_num = i + 1
            day_date = day_dates[i]
            
            day_activities = activities_by_day.get(str(day_num))
            if not day_activities:
                if day_num == 1:
                    day_activities = fallback_activities
                else:
                    trail_name = "nature trails" if day_num % 2 == 0 else "heritage walking tour"
                    day_activities = [
                        {
                            "title": f"Explore {state.tripDetails.destination} scenic {trail_name}",
                            "timeSlot": "Morning",
                            "time": "09:30 AM",
                            "location": state.tripDetails.destination,
                            "cost": 0,
                            "estimatedDuration": 120
                        }
                    ]
            
            day_food = food_by_day.get(str(day_num))
            if not day_food:
                if day_num == 1:
                    day_food = fallback_food
                else:
                    day_food = [
                        {
                            "mealType": "Lunch",
                            "restaurantName": f"Local {state.tripDetails.destination} Cafe",
                            "cuisineType": "Local Specialties",
                            "averagePrice": 250
                        }
                    ]

            itinerary_days.append({
                "dayNumber": day_num,
                "date": day_date,
                "summary": f"Day {day_num}: Adventure in {state.tripDetails.destination}",
                "staySuggestion": stay_suggestion,
                "foodSuggestions": day_food,
                "activities": day_activities
            })

        state.context["output"] = {
            "dayDates": day_dates,
            "itineraryDays": itinerary_days
        }
        return state
