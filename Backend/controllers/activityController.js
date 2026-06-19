import { Activity } from "../models/Activity.js";
import { Trip } from "../models/Trip.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ErrorHandler from "../middleware/errorMiddleware.js";

// @desc    Update status of a specific activity (e.g., mark as Completed, Skipped, or Rescheduled/Moved)
// @route   PATCH /api/v1/activities/:id/status
// @access  Private
export const updateActivityStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { status, dayNumber, time, timeSlot } = req.body;

  if (!status) {
    return next(new ErrorHandler("Please provide a status update.", 400));
  }

  // Validate status enum values
  const validStatuses = ["Pending", "Completed", "Skipped", "Moved"];
  if (!validStatuses.includes(status)) {
    return next(
      new ErrorHandler(
        `Invalid status. Allowed values are: ${validStatuses.join(", ")}`,
        400
      )
    );
  }

  // Find the activity and populate the trip
  const activity = await Activity.findById(id);
  if (!activity) {
    return next(new ErrorHandler("Activity not found.", 404));
  }

  // Verify that the user owns the trip associated with this activity
  const trip = await Trip.findById(activity.trip);
  if (!trip || trip.user.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("Not authorized to modify this activity.", 401));
  }

  // Apply updates
  activity.status = status;

  // If the activity is moved/rescheduled, allow updating its day, time slot, and time
  if (status === "Moved") {
    if (dayNumber !== undefined) {
      if (dayNumber < 1) {
        return next(new ErrorHandler("Day number must be at least 1.", 400));
      }
      activity.dayNumber = dayNumber;
    }
    if (time !== undefined) {
      activity.time = time;
    }
    if (timeSlot !== undefined) {
      const validSlots = ["Morning", "Afternoon", "Evening", "Night"];
      if (!validSlots.includes(timeSlot)) {
        return next(new ErrorHandler("Invalid time slot provided.", 400));
      }
      activity.timeSlot = timeSlot;
    }
  }

  await activity.save();

  return res.status(200).json({
    success: true,
    message: `Activity status updated to ${status} successfully.`,
    data: activity,
  });
});

// @desc    Get details of a single activity
// @route   GET /api/v1/activities/:id
// @access  Private
export const getActivityDetails = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const activity = await Activity.findById(id);
  if (!activity) {
    return next(new ErrorHandler("Activity not found.", 404));
  }

  // Verify ownership
  const trip = await Trip.findById(activity.trip);
  if (!trip || trip.user.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("Not authorized to view this activity.", 401));
  }

  return res.status(200).json({
    success: true,
    data: activity,
  });
});