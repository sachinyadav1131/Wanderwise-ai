import { Notification } from "../models/Notification.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// @desc    Get all notifications for current user
// @route   GET /api/v1/notifications
// @access  Private
export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id })
    .populate("changeSuggestion")
    .sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    count: notifications.length,
    data: notifications,
  });
});

// @desc    Mark notification as read
// @route   PATCH /api/v1/notifications/:id/read
// @access  Private
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findByIdAndUpdate(
    req.params.id,
    { isRead: true },
    { new: true }
  );
  return res.status(200).json({
    success: true,
    data: notification,
  });
});
