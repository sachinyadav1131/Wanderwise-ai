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
