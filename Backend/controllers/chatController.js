import { ChatMessage } from "../models/ChatMessage.js";
import { Trip } from "../models/Trip.js";
import { aiService } from "../services/aiService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ErrorHandler from "../middleware/errorMiddleware.js";

// @desc    Send a message to the trip AI chatbot and get a reply (Phase 5)
// @route   POST /api/v1/chat/message
// @access  Private
export const sendMessage = asyncHandler(async (req, res, next) => {
  const { tripId, message } = req.body;

  if (!tripId || !message) {
    return next(new ErrorHandler("Trip ID and message are required.", 400));
  }

  const trip = await Trip.findById(tripId);
  if (!trip || trip.user.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("Trip not found or unauthorized.", 404));
  }

  // 1. Create and save the user message
  const userMessage = await ChatMessage.create({
    trip: tripId,
    sender: "User",
    message,
  });

  // 2. Call the AI Service (forwards to FastAPI reasoning pipeline)
  const aiResult = await aiService.processChatMessage(trip, message);

  // 3. Create and save the AI reply, linking to the ChangeSuggestion if one was generated
  const aiMessage = await ChatMessage.create({
    trip: tripId,
    sender: "AI",
    message: aiResult.replyText,
    changeSuggestion: aiResult.suggestionId || null,
  });

  // Populate suggestion details if linked
  if (aiResult.suggestionId) {
    await aiMessage.populate("changeSuggestion");
  }

  return res.status(200).json({
    success: true,
    userMessage,
    aiMessage,
  });
});

// @desc    Get complete chat history for a specific trip
// @route   GET /api/v1/chat/trip/:tripId
// @access  Private
export const getChatHistory = asyncHandler(async (req, res, next) => {
  const { tripId } = req.params;

  const trip = await Trip.findById(tripId);
  if (!trip || trip.user.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("Trip not found or unauthorized.", 404));
  }

  const history = await ChatMessage.find({ trip: tripId })
    .populate("changeSuggestion")
    .sort({ createdAt: 1 });

  return res.status(200).json({
    success: true,
    count: history.length,
    data: history,
  });
});
