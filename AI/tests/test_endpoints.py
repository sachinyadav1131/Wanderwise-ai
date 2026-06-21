from fastapi.testclient import TestClient
from ai_service.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["status"] == "healthy"
    assert "dependencies" in data["data"]

def test_trip_overview():
    payload = {
        "destination": "Delhi",
        "startDate": "2026-06-21",
        "endDate": "2026-06-22",
        "totalBudget": 4000.0
    }
    response = client.post("/api/v1/ai/trip-overview", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["destination"] == "Delhi"

def test_detailed_itinerary():
    payload = {
        "tripId": "123",
        "destination": "Delhi",
        "startDate": "2026-06-21",
        "endDate": "2026-06-22",
        "totalBudget": 4000.0
    }
    response = client.post("/api/v1/ai/detailed-itinerary", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]["itineraryDays"]) > 0

def test_chat():
    payload = {
        "tripId": "123",
        "message": "It is going to rain today.",
        "chatHistory": [],
        "activities": [],
        "currentProgress": 0.0
    }
    response = client.post("/api/v1/ai/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["hasSuggestion"] is True
    assert data["data"]["suggestion"]["triggerType"] == "Weather"

def test_replan():
    payload = {
        "tripId": "123",
        "triggerType": "Weather",
        "reason": "Severe rain alert",
        "activities": []
    }
    response = client.post("/api/v1/ai/replan", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["estimatedBudgetImpact"] == 0.0
