import { Trip } from "../models/Trip.js";
import { Itinerary } from "../models/Itinerary.js";
import { Activity } from "../models/Activity.js";
import { StaySuggestion } from "../models/StaySuggestion.js";
import { FoodSuggestion } from "../models/FoodSuggestion.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// @desc    Create a new trip (Saves initial form as Draft)
// @route   POST /api/trips
// @access  Private
export const createTrip = asyncHandler(async (req, res) => {
  let {
    destination,
    startDate,
    endDate,
    totalBudget,
    travelers,
    duration,
    budget,
    companions,
    foodPreference,
    stayPreference,
    travelStyle,
    interests,
    placesToAvoid,
    specialNotes,
  } = req.body;

  // Translate simple frontend schema to DB schema if needed
  if (!startDate && duration) {
    startDate = new Date();
    endDate = new Date(Date.now() + Number(duration) * 24 * 60 * 60 * 1000);
  }

  if (!totalBudget && budget) {
    const durationDays = Number(duration) || 1;
    if (budget === "Cheap") totalBudget = 1500 * durationDays;
    else if (budget === "Moderate") totalBudget = 4000 * durationDays;
    else if (budget === "Luxury") totalBudget = 12000 * durationDays;
    else totalBudget = 2000 * durationDays;
  }

  if (!travelers && companions) {
    if (companions === "Just Me") travelers = 1;
    else if (companions === "A Couple") travelers = 2;
    else if (companions === "Family" || companions === "Friends") travelers = 4;
    else travelers = 1;
  }

  // Fallbacks if missing
  if (!startDate) startDate = new Date();
  if (!endDate) endDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  if (!totalBudget) totalBudget = 5000;
  if (!travelers) travelers = 1;

  if (!destination) {
    res.status(400);
    throw new Error("Destination is required.");
  }

  const trip = await Trip.create({
    user: req.user._id,
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
    status: "Planned", // Set to Planned per the requested user workflow (Upcoming Trip)
  });

  return res.status(201).json({
    success: true,
    message: "Trip created successfully.",
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

  // Prevent multiple active live trips
  if (req.body.status === "Started") {
    const activeLiveTrip = await Trip.findOne({
      user: req.user._id,
      status: "Started",
      _id: { $ne: req.params.id }
    });
    if (activeLiveTrip) {
      res.status(400);
      throw new Error("You already have an active live trip. Please complete it first.");
    }
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

// @desc    Get all user's trips
// @route   GET /api/trips
// @access  Private
export const getAllTrips = asyncHandler(async (req, res) => {
  const trips = await Trip.find({ user: req.user._id }).sort({ startDate: -1 });

  return res.status(200).json({
    success: true,
    count: trips.length,
    data: trips,
  });
});

// @desc    Get trip by ID
// @route   GET /api/trips/:id
// @access  Private
export const getTripById = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id);

  if (!trip) {
    res.status(404);
    throw new Error("Trip not found.");
  }

  // Ensure user owns this trip record
  if (trip.user.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error("Not authorized to access this trip.");
  }

  return res.status(200).json({
    success: true,
    data: trip,
  });
});

// @desc    Delete a trip (only upcoming/draft trips can be deleted)
// @route   DELETE /api/trips/:id
// @access  Private
export const deleteTrip = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id);

  if (!trip) {
    res.status(404);
    throw new Error("Trip not found.");
  }

  // Ensure user owns this trip record
  if (trip.user.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error("Not authorized to delete this trip.");
  }

  // Only "Draft" or "Planned" trips can be deleted
  if (trip.status !== "Draft" && trip.status !== "Planned") {
    res.status(400);
    throw new Error("Only upcoming trips can be deleted.");
  }

  // Cascade delete related records
  await Itinerary.deleteMany({ trip: req.params.id });
  await Activity.deleteMany({ trip: req.params.id });
  await StaySuggestion.deleteMany({ trip: req.params.id });
  await FoodSuggestion.deleteMany({ trip: req.params.id });
  await Trip.findByIdAndDelete(req.params.id);

  return res.status(200).json({
    success: true,
    message: "Trip deleted successfully.",
    data: req.params.id,
  });
});