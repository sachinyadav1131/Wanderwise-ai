import { MockSuggestionEngine } from "./SuggestionEngine.js";
import { Activity } from "../models/Activity.js";
import { Itinerary } from "../models/Itinerary.js";
import { ChatMessage } from "../models/ChatMessage.js";

const engine = new MockSuggestionEngine();

export const aiService = {
  processChatMessage: async (trip, userMessage) => {
    const itinerary = await Itinerary.find({ trip: trip._id });
    const activities = await Activity.find({ trip: trip._id });
    const chatHistory = await ChatMessage.find({ trip: trip._id }).sort({ createdAt: -1 }).limit(10);
    
    const completedCount = activities.filter(a => a.status === "Completed").length;
    const completionProgress = activities.length > 0 ? (completedCount / activities.length) * 100 : 0;

    return await engine.generateSuggestion({
      trip,
      itinerary,
      activities,
      chatHistory: chatHistory.reverse(),
      completionProgress,
    });
  }
};
