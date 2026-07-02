import { Activity } from "../models/Activity.js";
import { Itinerary } from "../models/Itinerary.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { ChangeSuggestion } from "../models/ChangeSuggestion.js";
import { AgentLog } from "../models/AgentLog.js";
import ErrorHandler from "../middleware/errorMiddleware.js";

// ---------------------------------------------------------------------------
// FastAPI HTTP Client Helper
// ---------------------------------------------------------------------------
const AI_BASE_URL = () => process.env.AI_SERVICE_URL || "http://localhost:8000";

/**
 * Generic helper to POST JSON to the FastAPI AI microservice.
 * Unwraps the standard APIResponse envelope { success, message, data }.
 * Throws ErrorHandler on non-2xx responses so Express error middleware can catch it.
 */
async function callFastAPI(endpoint, body) {
  const url = `${AI_BASE_URL()}${endpoint}`;

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (networkErr) {
    throw new ErrorHandler(
      `AI service unreachable at ${url}: ${networkErr.message}`,
      503
    );
  }

  const json = await res.json();

  if (!res.ok) {
    // FastAPI returns { success: false, message, data } for errors
    const errMsg = json?.message || `AI service returned HTTP ${res.status}`;
    throw new ErrorHandler(errMsg, res.status);
  }

  // Unwrap the APIResponse envelope
  if (json.success === false) {
    throw new ErrorHandler(json.message || "AI service returned an error", 500);
  }

  return json.data; // The actual payload
}

// ---------------------------------------------------------------------------
// Build a TripRequest payload that matches FastAPI's Pydantic schema exactly
// ---------------------------------------------------------------------------
function buildTripRequestPayload(trip) {
  return {
    destination: trip.destination,
    startDate: new Date(trip.startDate).toISOString().split("T")[0],
    endDate: new Date(trip.endDate).toISOString().split("T")[0],
    totalBudget: trip.totalBudget,
    travelers: trip.travelers || 1,
    foodPreference: trip.foodPreference || "Any",
    stayPreference: trip.stayPreference || "Any",
    travelStyle: trip.travelStyle || "Moderate",
    interests: trip.interests || [],
    placesToAvoid: trip.placesToAvoid || [],
    specialNotes: trip.specialNotes || null,
  };
}

// ---------------------------------------------------------------------------
// Exported AI Service
// ---------------------------------------------------------------------------
export const aiService = {
  /**
   * Calls POST /api/v1/ai/trip-overview
   * Returns the high-level overview from the AI planner pipeline.
   */
  generateTripOverview: async (trip) => {
    const payload = buildTripRequestPayload(trip);
    return await callFastAPI("/api/v1/ai/trip-overview", payload);
  },

  /**
   * Calls POST /api/v1/ai/detailed-itinerary
   * Returns the full day-by-day itinerary from the AI pipeline.
   */
  generateDetailedItinerary: async (trip) => {
    const payload = buildTripRequestPayload(trip);
    return await callFastAPI("/api/v1/ai/detailed-itinerary", payload);
  },

  /**
   * Processes a chat message by forwarding context to FastAPI.
   * Calls POST /api/v1/ai/chat with trip details, chat history,
   * activities, and progress metrics.
   *
   * If the AI returns a change suggestion, saves it as a ChangeSuggestion
   * document in MongoDB and returns its _id.
   */
  processChatMessage: async (trip, userMessage) => {
    const activities = await Activity.find({ trip: trip._id });
    const chatHistory = await ChatMessage.find({ trip: trip._id })
      .sort({ createdAt: -1 })
      .limit(10);

    const rejectedSuggestions = await ChangeSuggestion.find({
      trip: trip._id,
      status: "Rejected"
    }).select("generatedSummary");
    const rejectedList = rejectedSuggestions.map((s) => s.generatedSummary).filter(Boolean);

    const completedCount = activities.filter(
      (a) => a.status === "Completed"
    ).length;
    const completionProgress =
      activities.length > 0 ? (completedCount / activities.length) * 100 : 0;

    // Build the ChatPayload matching FastAPI's Pydantic model
    const chatPayload = {
      tripId: trip._id.toString(),
      message: userMessage,
      chatHistory: chatHistory.reverse().map((msg) => ({
        sender: msg.sender,
        message: msg.message,
        createdAt: msg.createdAt,
      })),
      activities: activities.map((act) => ({
        _id: act._id.toString(),
        title: act.title,
        location: act.location,
        dayNumber: act.dayNumber,
        timeSlot: act.timeSlot,
        time: act.time,
        status: act.status,
        cost: act.cost,
      })),
      currentProgress: completionProgress,
      tripDetails: buildTripRequestPayload(trip),
      rejectedSuggestions: rejectedList,
    };

    // Log the AI request
    await AgentLog.create({
      trip: trip._id,
      agentName: "FastAPIChatAgent",
      action: "ForwardToAI",
      reasoning: `Forwarding chat to FastAPI. Progress: ${completionProgress.toFixed(2)}%. Message: "${userMessage}"`,
      details: { completionProgress, historyLength: chatHistory.length },
    });

    const aiOutput = await callFastAPI("/api/v1/ai/chat", chatPayload);

    // If the AI returned a change suggestion, persist it to MongoDB
    let suggestionId = null;
    if (aiOutput.hasSuggestion && aiOutput.suggestion) {
      const sug = aiOutput.suggestion;
      const suggestion = await ChangeSuggestion.create({
        trip: trip._id,
        triggerType: sug.triggerType || "Chat",
        reason: sug.reason || "AI-generated suggestion",
        generatedSummary: sug.generatedSummary || aiOutput.replyText,
        estimatedBudgetImpact: sug.estimatedBudgetImpact || 0,
        estimatedTimeImpact: sug.estimatedTimeImpact || 0,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        beforeSnapshot: sug.beforeSnapshot || { activities: [], staySuggestions: [], foodSuggestions: [] },
        afterSnapshot: sug.afterSnapshot || { activities: [], staySuggestions: [], foodSuggestions: [] },
        suggestedChanges: sug.suggestedChanges || { activities: [] },
      });
      suggestionId = suggestion._id;
    }

    return {
      replyText: aiOutput.replyText || "I'm here to help with your trip!",
      suggestionId,
    };
  },
};
