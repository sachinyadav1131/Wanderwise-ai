import { Trip } from "../models/Trip.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// @desc    Create a new trip (Saves initial form as Draft)
// @route   POST /api/trips
// @access  Private
export const createTrip = asyncHandler(async (req, res) => {
  const {
    destination,
    startDate,
    endDate,
    totalBudget,
    travelers,
    foodPreference,
    stayPreference,
    travelStyle,
    interests,
    placesToAvoid,
    specialNotes,
  } = req.body;

  if (!destination || !startDate || !endDate || !totalBudget) {
    res.status(400);
    throw new Error("Please provide destination, dates, and budget.");
  }

  const trip = await Trip.create({
    user: req.user._id, // Assuming req.user is set by your authMiddleware
    destination,
    startDate,
    endDate,
    totalBudget,
    travelers,
    foodPreference,
    stayPreference,
    travelStyle,
    interests,
    placesToAvoid,
    specialNotes,
    status: "Draft", // Default status per flow guidelines
  });

  return res.status(201).json({
    success: true,
    message: "Trip created successfully as Draft.",
    data: trip,
  });
});

// @desc    Get user's upcoming trips (Draft, Planned, Started statuses)
// @route   GET /api/trips/upcoming
// @access  Private
export const getUpcomingTrips = asyncHandler(async (req, res) => {
  const trips = await Trip.find({
    user: req.user._id,
    status: { $in: ["Draft", "Planned", "Started"] },
  }).sort({ startDate: 1 });

  return res.status(200).json({
    success: true,
    count: trips.length,
    data: trips,
  });
});

// @desc    Get user's completed trips
// @route   GET /api/trips/completed
// @access  Private
export const getCompletedTrips = asyncHandler(async (req, res) => {
  const trips = await Trip.find({
    user: req.user._id,
    status: "Completed",
  }).sort({ endDate: -1 });

  return res.status(200).json({
    success: true,
    count: trips.length,
    data: trips,
  });
});

// @desc    Update/Edit trip details before it starts
// @route   PUT /api/trips/:id
// @access  Private
export const editTrip = asyncHandler(async (req, res) => {
  let trip = await Trip.findById(req.params.id);

  if (!trip) {
    res.status(404);
    throw new Error("Trip not found.");
  }

  // Ensure user owns this trip record
  if (trip.user.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error("Not authorized to modify this trip.");
  }

  trip = await Trip.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  return res.status(200).json({
    success: true,
    message: "Trip updated successfully.",
    data: trip,
  });
});