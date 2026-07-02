import { Trip } from "../models/Trip.js";
import { Itinerary } from "../models/Itinerary.js";
import { Activity } from "../models/Activity.js";
import { StaySuggestion } from "../models/StaySuggestion.js";
import { FoodSuggestion } from "../models/FoodSuggestion.js";
import { aiService } from "../services/aiService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ErrorHandler from "../middleware/errorMiddleware.js";

// Helper function to calculate date differences
const getDaysArray = (start, end) => {
  const arr = [];
  for (let dt = new Date(start); dt <= new Date(end); dt.setDate(dt.getDate() + 1)) {
    arr.push(new Date(dt));
  }
  return arr;
};

// @desc    Generate an AI-powered itinerary based on trip parameters
// @route   POST /api/v1/itineraries/generate/:tripId
// @access  Private
export const generateItinerary = asyncHandler(async (req, res, next) => {
  const { tripId } = req.params;

  const trip = await Trip.findById(tripId);
  if (!trip) {
    return next(new ErrorHandler("Trip not found", 404));
  }

  // Ensure user owns this trip
  if (trip.user.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("Not authorized to access this trip", 401));
  }

  // 1. Clean up any existing itinerary details for this trip to allow regeneration
  await Itinerary.deleteMany({ trip: tripId });
  await Activity.deleteMany({ trip: tripId });
  await StaySuggestion.deleteMany({ trip: tripId });
  await FoodSuggestion.deleteMany({ trip: tripId });

  // 2. Call the AI service to generate a detailed itinerary
  const aiResult = await aiService.generateDetailedItinerary(trip);
  const itineraryDays = aiResult?.itineraryDays || [];
  const dayDates = getDaysArray(trip.startDate, trip.endDate);

  const generatedItineraries = [];

  for (let i = 0; i < itineraryDays.length; i++) {
    const dayData = itineraryDays[i];
    const dayNumber = dayData.dayNumber || i + 1;
    const date = dayDates[i] || new Date(trip.startDate);

    // Create the base Itinerary document
    const itinerary = await Itinerary.create({
      trip: tripId,
      dayNumber,
      date,
      summary: dayData.summary || `Day ${dayNumber}: Highlights of ${trip.destination}`,
      activities: [],
      staySuggestion: null,
      foodSuggestions: [],
    });

    // Create StaySuggestion if returned by AI
    let stayId = null;
    const stayData = dayData.staySuggestion;
    if (stayData && stayData.locationArea) {
      const stay = await StaySuggestion.create({
        trip: tripId,
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
          image: opt.image || "",
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
        trip: tripId,
        dayNumber,
        mealType: foodData.mealType || "Lunch",
        nearPlace: foodData.nearPlace || foodData.location || trip.destination,
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
        trip: tripId,
        itinerary: itinerary._id,
        dayNumber,
        title: actData.title,
        description: actData.description || "",
        image: actData.image || "",
        timeSlot: actData.timeSlot || "Morning",
        time: actData.time || "",
        location: actData.location || trip.destination,
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

    generatedItineraries.push(itinerary);
  }

  // 3. Update the Trip status to "Planned"
  trip.status = "Planned";
  await trip.save();

  return res.status(200).json({
    success: true,
    message: `AI itinerary for ${generatedItineraries.length} day(s) generated successfully.`,
    data: generatedItineraries,
  });
});

// @desc    Get itinerary details by Trip ID
// @route   GET /api/v1/itineraries/trip/:tripId
// @access  Private
export const getItineraryByTripId = asyncHandler(async (req, res, next) => {
  const { tripId } = req.params;

  const trip = await Trip.findById(tripId);
  if (!trip) {
    return next(new ErrorHandler("Trip not found", 404));
  }

  // Ensure user owns this trip
  if (trip.user.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("Not authorized to access this trip", 401));
  }

  const itineraries = await Itinerary.find({ trip: tripId })
    .populate("activities")
    .populate("staySuggestion")
    .populate("foodSuggestions")
    .sort({ dayNumber: 1 });

  return res.status(200).json({
    success: true,
    count: itineraries.length,
    data: itineraries,
  });
});

// @desc    Search cover/activity image using DuckDuckGo (proxied to Python service)
// @route   GET /api/v1/itineraries/search-image
// @access  Private
export const searchImage = asyncHandler(async (req, res) => {
  const { query } = req.query;
  if (!query) {
    res.status(400);
    throw new Error("Search query parameter is required.");
  }

  const aiBaseUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
  try {
    const response = await fetch(`${aiBaseUrl}/api/v1/ai/cover-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destination: query }),
    });

    if (!response.ok) {
      throw new Error(`AI service returned status code ${response.status}`);
    }

    const json = await response.json();
    return res.status(200).json({
      success: true,
      imageUrl: json?.data?.coverImage || "",
    });
  } catch (error) {
    console.error("[Backend Search Image Proxy] Failed:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});