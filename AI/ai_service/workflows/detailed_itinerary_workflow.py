from ai_service.schemas.domain import TripRequest

class DetailedItineraryWorkflow:
    async def run(self, request: TripRequest) -> dict:
        # Mock logic simulating structured itinerary planning
        return {
            "dayDates": [request.startDate],
            "itineraryDays": [
                {
                    "dayNumber": 1,
                    "date": request.startDate,
                    "summary": f"Day 1: Highlights of {request.destination}",
                    "staySuggestion": {
                        "locationArea": "Connaught Place/Paharganj",
                        "options": [
                            {
                                "name": "Smyle Inn Hostel",
                                "pricePerNight": 950,
                                "type": "Hostel"
                            }
                        ]
                    },
                    "foodSuggestions": [
                        {
                            "mealType": "Lunch",
                            "restaurantName": "Khan Chacha",
                            "cuisineType": "Mughlai",
                            "averagePrice": 300
                        }
                    ],
                    "activities": [
                        {
                            "title": "Visit India Gate",
                            "timeSlot": "Morning",
                            "time": "09:00 AM",
                            "location": "India Gate",
                            "cost": 0,
                            "estimatedDuration": 60
                        }
                    ]
                }
            ]
        }
