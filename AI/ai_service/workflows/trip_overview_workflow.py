from ai_service.schemas.domain import TripRequest

class TripOverviewWorkflow:
    async def run(self, request: TripRequest) -> dict:
        # Mock logic simulating agent planning (PlannerAgent, StayAgent, etc.)
        return {
            "destination": request.destination,
            "durationDays": 1,
            "recommendedStayArea": "Connaught Place/Paharganj",
            "stayRationale": "Central location, highly connected via metro, and budget-friendly hostel options.",
            "highLevelPlan": [
                {
                    "dayNumber": 1,
                    "summary": f"Day 1: Highlights of {request.destination}",
                    "staySuggestion": "Smyle Inn Hostel"
                }
            ]
        }
