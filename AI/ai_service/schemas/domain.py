from pydantic import BaseModel, Field
from typing import Generic, TypeVar, Any, Optional

T = TypeVar("T")

class TripRequest(BaseModel):
    destination: str
    startDate: str
    endDate: str
    totalBudget: float
    travelers: int = 1
    foodPreference: str = "Any"
    stayPreference: str = "Any"
    travelStyle: str = "Moderate"
    interests: list[str] = Field(default_factory=list)
    placesToAvoid: list[str] = Field(default_factory=list)
    specialNotes: Optional[str] = None

class WorkflowState(BaseModel):
    tripId: str
    tripDetails: TripRequest
    chatHistory: list[dict] = Field(default_factory=list)
    activities: list[dict] = Field(default_factory=list)
    currentProgress: float = 0.0
    trace_id: str = "SYSTEM"
    context: dict[str, Any] = Field(default_factory=dict)

class ChangeProposal(BaseModel):
    generatedSummary: str
    estimatedBudgetImpact: float
    estimatedTimeImpact: float
    beforeSnapshot: dict
    afterSnapshot: dict
    suggestedChanges: dict

class AgentResult(BaseModel):
    tripId: str
    agentName: str
    action: str
    reasoning: str
    details: Optional[dict] = None

class APIResponse(BaseModel, Generic[T]):
    success: bool
    message: str
    data: Optional[T] = None

# ---------------------------------------------------------------------------
# MCP Tool Output Schemas
# Each tool returns a typed Pydantic model so agents receive validated data.
# ---------------------------------------------------------------------------

class WeatherResult(BaseModel):
    """Output schema for the check_weather MCP tool."""
    location: str
    date: str
    condition: str                        # e.g. "Rainy", "Sunny", "Cloudy"
    precipitation_pct: int                # 0–100
    temperature_celsius: float
    wind_kmh: float
    advisory: Optional[str] = None       # e.g. "Carry umbrella", "Avoid outdoor"

class HotelOption(BaseModel):
    """Single hotel entry returned by find_hotels."""
    name: str
    type: str                             # Hostel / Budget Hotel / 3-Star / etc.
    area: str
    price_per_night: float
    rating: float                         # out of 5
    amenities: list[str] = Field(default_factory=list)
    distance_from_center_km: float
    image: Optional[str] = None

class HotelResult(BaseModel):
    """Output schema for the find_hotels MCP tool."""
    destination: str
    area: str
    options: list[HotelOption] = Field(default_factory=list)

class PlaceItem(BaseModel):
    """Single place/attraction entry returned by find_places."""
    name: str
    category: str                         # attraction / indoor / market / cafe
    location: str
    entry_fee: float = 0.0
    avg_duration_minutes: int = 60
    tags: list[str] = Field(default_factory=list)
    is_indoor: bool = False

class PlacesResult(BaseModel):
    """Output schema for the find_places MCP tool."""
    destination: str
    category: str
    places: list[PlaceItem] = Field(default_factory=list)

class DistanceResult(BaseModel):
    """Output schema for the calculate_distance MCP tool."""
    origin: str
    destination: str
    mode: str                             # metro / auto / walk
    distance_km: float
    duration_minutes: int
    estimated_cost: float                 # INR

class ItineraryResult(BaseModel):
    """Output schema for save_itinerary / update_itinerary MCP tools."""
    trip_id: str
    operation: str                        # "saved" or "updated"
    days_stored: int
    status: str = "ok"

class NotificationResult(BaseModel):
    """Output schema for the create_notification MCP tool."""
    notification_id: str
    trip_id: str
    type: str                             # popup / email / in_app
    title: str
    status: str = "queued"

class AgentLogResult(BaseModel):
    """Output schema for the store_agent_log MCP tool."""
    log_id: str
    trip_id: str
    agent_name: str
    action: str
    status: str = "stored"

# ---------------------------------------------------------------------------
# MCP Envelope Schemas (used by the /api/v1/mcp/call debug endpoint)
# ---------------------------------------------------------------------------

class MCPToolCall(BaseModel):
    """Request envelope for calling an MCP tool directly."""
    tool_name: str
    args: dict[str, Any] = Field(default_factory=dict)

class MCPToolResponse(BaseModel):
    """Response envelope wrapping any MCP tool result."""
    tool_name: str
    success: bool
    result: Optional[Any] = None
    error: Optional[str] = None

