import { ChangeSuggestion } from "../models/ChangeSuggestion.js";
import { Activity } from "../models/Activity.js";
import { Itinerary } from "../models/Itinerary.js";
import { Trip } from "../models/Trip.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ErrorHandler from "../middleware/errorMiddleware.js";
import mongoose from "mongoose";

// @desc    Get change suggestions for a trip (optionally filter by status)
// @route   GET /api/v1/suggestions/trip/:tripId
// @access  Private
export const getSuggestionsByTrip = asyncHandler(async (req, res, next) => {
  const { tripId } = req.params;
  const { status } = req.query;

  const filter = { trip: tripId };
  if (status) {
    filter.status = status;
  }

  const suggestions = await ChangeSuggestion.find(filter).sort({ createdAt: -1 });
  return res.status(200).json({
    success: true,
    data: suggestions,
  });
});

// @desc    Approve a pending itinerary change suggestion atomically and idempotently
// @route   POST /api/v1/suggestions/:id/approve
// @access  Private
export const approveSuggestion = asyncHandler(async (req, res, next) => {
  const suggestion = await ChangeSuggestion.findById(req.params.id);
  if (!suggestion) {
    return next(new ErrorHandler("Suggestion not found.", 404));
  }

  // Idempotency: Return early with HTTP 200 if already approved
  if (suggestion.status === "Approved") {
    return res.status(200).json({
      success: true,
      message: "Suggestion was already approved and applied.",
    });
  }

  if (suggestion.status === "Rejected") {
    return next(new ErrorHandler("A rejected suggestion cannot be approved.", 400));
  }

  const trip = await Trip.findById(suggestion.trip);
  if (!trip || trip.user.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("Unauthorized access to this trip suggestion.", 401));
  }

  // Start a transaction session for atomicity
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const { activities } = suggestion.suggestedChanges;

      // Apply the structured differences/operations
      // 1. Process ADD operations
      for (const act of activities.filter(a => a.action === "ADD")) {
        const itinerary = await Itinerary.findOne({ trip: trip._id, dayNumber: act.data.dayNumber }).session(session);
        if (!itinerary) {
          throw new Error(`Itinerary for day ${act.data.dayNumber} not found.`);
        }

        const [newActivity] = await Activity.create([
          {
            ...act.data,
            trip: trip._id,
            itinerary: itinerary._id,
          }
        ], { session });

        itinerary.activities.push(newActivity._id);
        await itinerary.save({ session });
      }

      // 2. Process UPDATE operations
      for (const act of activities.filter(a => a.action === "UPDATE")) {
        await Activity.findByIdAndUpdate(act.activityId, act.data, { session, runValidators: true });
      }

      // 3. Process DELETE operations
      for (const act of activities.filter(a => a.action === "DELETE")) {
        await Activity.findByIdAndDelete(act.activityId, { session });
        await Itinerary.updateOne(
          { trip: trip._id },
          { $pull: { activities: act.activityId } },
          { session }
        );
      }

      // Mark suggestion as Approved
      suggestion.status = "Approved";
      await suggestion.save({ session });

      // Create confirming AI Chat message in history
      await ChatMessage.create([
        {
          trip: trip._id,
          sender: "AI",
          message: `Itinerary updates applied: "${suggestion.generatedSummary}"`,
        }
      ], { session });
    });

    return res.status(200).json({
      success: true,
      message: "Suggestion approved and itinerary modified successfully.",
    });
  } catch (error) {
    return next(new ErrorHandler(`Approval transaction failed: ${error.message}`, 500));
  } finally {
    session.endSession();
  }
});

// @desc    Reject a pending itinerary change suggestion
// @route   POST /api/v1/suggestions/:id/reject
// @access  Private
export const rejectSuggestion = asyncHandler(async (req, res, next) => {
  const suggestion = await ChangeSuggestion.findById(req.params.id);
  if (!suggestion) {
    return next(new ErrorHandler("Suggestion not found.", 404));
  }

  // Idempotency: Return early if already rejected
  if (suggestion.status === "Rejected") {
    return res.status(200).json({
      success: true,
      message: "Suggestion already marked as rejected.",
    });
  }

  if (suggestion.status === "Approved") {
    return next(new ErrorHandler("An approved suggestion cannot be rejected.", 400));
  }

  const trip = await Trip.findById(suggestion.trip);
  if (!trip || trip.user.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("Unauthorized access to this trip suggestion.", 401));
  }

  suggestion.status = "Rejected";
  await suggestion.save();

  return res.status(200).json({
    success: true,
    message: "Suggestion rejected successfully.",
  });
});
