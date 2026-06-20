import { notificationService } from "./notificationService.js";
import { ChangeSuggestion } from "../models/ChangeSuggestion.js";
import { Activity } from "../models/Activity.js";

export const weatherService = {
  // Simulates weather checking trigger
  triggerWeatherAlert: async (trip) => {
    const outdoorActivity = await Activity.findOne({ trip: trip._id, title: /Lodhi Garden/i });
    if (!outdoorActivity) return null;

    const suggestedChanges = {
      activities: [
        {
          action: "UPDATE",
          activityId: outdoorActivity._id,
          data: { status: "Moved", dayNumber: outdoorActivity.dayNumber + 1 },
        },
        {
          action: "ADD",
          data: {
            title: "Visit Crafts Museum (Indoor)",
            description: "Rain backup indoor activity.",
            dayNumber: outdoorActivity.dayNumber,
            timeSlot: "Afternoon",
            time: "02:00 PM",
            location: "Pragati Maidan",
            isAlternative: true,
          },
        },
      ],
    };

    const beforeSnapshot = { activities: [outdoorActivity.toObject()] };
    const afterSnapshot = {
      activities: [
        { ...outdoorActivity.toObject(), status: "Moved", dayNumber: outdoorActivity.dayNumber + 1 },
        { title: "Visit Crafts Museum (Indoor)", location: "Pragati Maidan", dayNumber: outdoorActivity.dayNumber, timeSlot: "Afternoon" }
      ]
    };

    const suggestion = await ChangeSuggestion.create({
      trip: trip._id,
      triggerType: "Weather",
      reason: "Severe precipitation warning near Lodhi Garden.",
      generatedSummary: "Postpone Lodhi Garden visit and detour to Crafts Museum (Indoor) due to severe rain forecast.",
      estimatedBudgetImpact: 0,
      estimatedTimeImpact: 0,
      beforeSnapshot,
      afterSnapshot,
      suggestedChanges,
    });

    await notificationService.createNotification(
      trip.user,
      trip._id,
      "Weather Alert: Rain Expected",
      "Heavy rain is forecasted. Click to see the proposed indoor itinerary changes.",
      "WeatherAlert",
      suggestion._id
    );

    return suggestion;
  },
};
