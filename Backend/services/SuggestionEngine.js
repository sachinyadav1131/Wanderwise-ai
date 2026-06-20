import { ChangeSuggestion } from "../models/ChangeSuggestion.js";
import { AgentLog } from "../models/AgentLog.js";

// SuggestionEngine Interface Base Class
export class SuggestionEngine {
  async generateSuggestion({ trip, itinerary, activities, chatHistory, completionProgress }) {
    throw new Error("generateSuggestion must be implemented by subclass");
  }
}

// Mock Implementation for Phase 5
export class MockSuggestionEngine extends SuggestionEngine {
  async generateSuggestion({ trip, itinerary, activities, chatHistory, completionProgress }) {
    const lastMessage = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1].message.toLowerCase() : "";

    await AgentLog.create({
      trip: trip._id,
      agentName: "MockPlannerAgent",
      action: "RunMockReasoning",
      reasoning: `Analyzing trip destination ${trip.destination} with progress ${completionProgress.toFixed(2)}%. Match query: "${lastMessage}"`,
      details: { completionProgress, historyLength: chatHistory.length }
    });

    // Scenario A: Weather detour
    if (lastMessage.includes("rain") || lastMessage.includes("weather")) {
      const target = activities.find(a => a.title.match(/India Gate/i));
      const beforeSnapshot = { activities: activities.map(a => a.toObject()) };

      const suggestedChanges = {
        activities: [
          ...(target ? [{ action: "UPDATE", activityId: target._id, data: { status: "Moved", dayNumber: target.dayNumber + 1 } }] : []),
          {
            action: "ADD",
            data: {
              title: "Visit National Museum",
              description: "Rain backup indoor activity.",
              dayNumber: 1,
              timeSlot: "Afternoon",
              time: "02:00 PM",
              location: "National Museum, Janpath",
              cost: 20,
              isAlternative: true,
            },
          },
        ],
      };

      const afterSnapshot = {
        activities: [
          ...activities.filter(a => !target || a._id.toString() !== target._id.toString()).map(a => a.toObject()),
          ...(target ? [{ ...target.toObject(), status: "Moved", dayNumber: target.dayNumber + 1 }] : []),
          { title: "Visit National Museum", location: "National Museum, Janpath", dayNumber: 1, timeSlot: "Afternoon" }
        ]
      };

      const suggestion = await ChangeSuggestion.create({
        trip: trip._id,
        triggerType: "Weather",
        reason: "Precipitation warning. Redirecting to indoor Museum.",
        generatedSummary: "Move India Gate to tomorrow and visit the indoor National Museum today.",
        estimatedBudgetImpact: 20,
        estimatedTimeImpact: 30, // in minutes
        beforeSnapshot,
        afterSnapshot,
        suggestedChanges,
      });

      return {
        replyText: `It looks like heavy rain is expected. I suggest visiting the indoor National Museum today instead of India Gate, and postponing India Gate. Do you want to apply this update?`,
        suggestionId: suggestion._id,
      };
    }

    // Scenario B: Reschedule / Move activity
    if (lastMessage.includes("india gate") && (lastMessage.includes("move") || lastMessage.includes("don't want"))) {
      const target = activities.find(a => a.title.match(/India Gate/i));
      if (target) {
        const beforeSnapshot = { activities: activities.map(a => a.toObject()) };
        const suggestedChanges = {
          activities: [
            { action: "UPDATE", activityId: target._id, data: { dayNumber: target.dayNumber + 1, timeSlot: "Evening", time: "06:00 PM" } },
          ],
        };

        const afterSnapshot = {
          activities: activities.map(a => 
            a._id.toString() === target._id.toString() 
              ? { ...a.toObject(), dayNumber: target.dayNumber + 1, timeSlot: "Evening", time: "06:00 PM" }
              : a.toObject()
          )
        };

        const suggestion = await ChangeSuggestion.create({
          trip: trip._id,
          triggerType: "Chat",
          reason: "User requested rescheduled India Gate.",
          generatedSummary: "Reschedule India Gate visit to tomorrow evening.",
          estimatedBudgetImpact: 0,
          estimatedTimeImpact: 0,
          beforeSnapshot,
          afterSnapshot,
          suggestedChanges,
        });

        return {
          replyText: `I can reschedule India Gate to tomorrow evening at 6:00 PM. Would you like to confirm?`,
          suggestionId: suggestion._id,
        };
      }
    }

    return {
      replyText: "I am ready. Tell me about weather changes, or ask to skip/reschedule any destinations.",
      suggestionId: null,
    };
  }
}

// Future FastAPI compatibility
export class FastAPISuggestionEngine extends SuggestionEngine {
  async generateSuggestion({ trip, itinerary, activities, chatHistory, completionProgress }) {
    // Phase 6 FastAPI call will go here
    return {
      replyText: "FastAPISuggestionEngine is not active.",
      suggestionId: null,
    };
  }
}
