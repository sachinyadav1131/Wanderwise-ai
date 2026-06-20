import { Notification } from "../models/Notification.js";

export const notificationService = {
  createNotification: async (userId, tripId, title, message, type, suggestionId = null) => {
    return await Notification.create({
      user: userId,
      trip: tripId,
      title,
      message,
      type,
      changeSuggestion: suggestionId,
    });
  },
};
