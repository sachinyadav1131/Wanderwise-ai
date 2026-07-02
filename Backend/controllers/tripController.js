import { Trip } from "../models/Trip.js";
import { Itinerary } from "../models/Itinerary.js";
import { Activity } from "../models/Activity.js";
import { StaySuggestion } from "../models/StaySuggestion.js";
import { FoodSuggestion } from "../models/FoodSuggestion.js";
import { aiService } from "../services/aiService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Helper: compute dates array between start and end
const getDaysArray = (start, end) => {
  const arr = [];
  for (let dt = new Date(start); dt <= new Date(end); dt.setDate(dt.getDate() + 1)) {
    arr.push(new Date(dt));
  }
  return arr;
};

// @desc    Create a new trip (calls AI to generate itinerary, saves as Planned)
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
    // For a duration of N days, the end date is N-1 days after the start date (e.g. 1-day trip ends today)
    endDate = new Date(Date.now() + (Number(duration) - 1) * 24 * 60 * 60 * 1000);
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

  // 1. Save the base trip record
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
    status: "Draft",
  });

  // 2. Call the AI service to generate a detailed itinerary
  let aiWarning = null;
  try {
    const aiResult = await aiService.generateDetailedItinerary(trip);
    const itineraryDays = aiResult?.itineraryDays || [];
    const dayDates = getDaysArray(trip.startDate, trip.endDate);

    for (let i = 0; i < itineraryDays.length; i++) {
      const dayData = itineraryDays[i];
      const dayNumber = dayData.dayNumber || i + 1;
      const date = dayDates[i] || new Date(trip.startDate);

      // Create the base Itinerary document
      const itinerary = await Itinerary.create({
        trip: trip._id,
        dayNumber,
        date,
        summary: dayData.summary || `Day ${dayNumber}: Highlights of ${destination}`,
        activities: [],
        staySuggestion: null,
        foodSuggestions: [],
      });

      // Create StaySuggestion if returned by AI
      let stayId = null;
      const stayData = dayData.staySuggestion;
      if (stayData && stayData.locationArea) {
        const stay = await StaySuggestion.create({
          trip: trip._id,
          dayNumber,
          locationArea: stayData.locationArea,
          rationale: stayData.rationale || "",
          options: (stayData.options || []).map((opt) => ({
            name: opt.name,
            type: opt.type || "Hotel",
            pricePerNight: opt.pricePerNight || opt.price_per_night || 0,
            rating: opt.rating || 0,
            distanceFromRoute: opt.distanceFromRoute || opt.distance_from_center_km ? `${opt.distance_from_center_km} km` : "",
            foodNearby: opt.foodNearby || [],
            features: opt.features || opt.amenities || [],
            address: opt.address || opt.area || "",
          })),
          selectedOption: stayData.options?.[0]
            ? {
              name: stayData.options[0].name,
              pricePerNight: stayData.options[0].pricePerNight || stayData.options[0].price_per_night || 0,
              type: stayData.options[0].type || "Hotel",
            }
            : undefined,
        });
        stayId = stay._id;
      }

      // Create FoodSuggestions if returned by AI
      const foodIds = [];
      for (const foodData of dayData.foodSuggestions || []) {
        const food = await FoodSuggestion.create({
          trip: trip._id,
          dayNumber,
          mealType: foodData.mealType || "Lunch",
          nearPlace: foodData.nearPlace || foodData.location || destination,
          restaurantName: foodData.restaurantName || "Local Restaurant",
          cuisineType: foodData.cuisineType || "",
          costEstimate: foodData.costEstimate || "",
          averagePrice: foodData.averagePrice || 0,
          rating: foodData.rating || 0,
          distanceFromRoute: foodData.distanceFromRoute || "",
          rationale: foodData.rationale || "",
        });
        foodIds.push(food._id);
      }

      // Create Activities for this day
      const activityIds = [];
      for (const actData of dayData.activities || []) {
        const activity = await Activity.create({
          trip: trip._id,
          itinerary: itinerary._id,
          dayNumber,
          title: actData.title,
          description: actData.description || "",
          timeSlot: actData.timeSlot || "Morning",
          time: actData.time || "",
          location: actData.location || destination,
          cost: actData.cost || 0,
          estimatedDuration: actData.estimatedDuration || 60,
          transportDetails: actData.transportDetails || { mode: "None" },
          isAlternative: actData.isAlternative || false,
        });
        activityIds.push(activity._id);
      }

      // Link everything back to the itinerary
      itinerary.activities = activityIds;
      itinerary.staySuggestion = stayId;
      itinerary.foodSuggestions = foodIds;
      await itinerary.save();
    }

    // Mark trip as Planned
    trip.status = "Planned";
    await trip.save();
  } catch (aiError) {
    // AI service is down or returned an error — save trip as Draft with a warning
    console.error("AI itinerary generation failed:", aiError.message);
    aiWarning = `Trip saved as Draft. AI itinerary generation failed: ${aiError.message}. You can regenerate the itinerary later.`;
  }

  return res.status(201).json({
    success: true,
    message: aiWarning || "Trip created and itinerary generated successfully.",
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