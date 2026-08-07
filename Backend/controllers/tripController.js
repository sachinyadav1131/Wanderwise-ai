import { Trip } from "../models/Trip.js";
import { Itinerary } from "../models/Itinerary.js";
import { Activity } from "../models/Activity.js";
import { StaySuggestion } from "../models/StaySuggestion.js";
import { FoodSuggestion } from "../models/FoodSuggestion.js";
import { Notification } from "../models/Notification.js";
import { aiService } from "../services/aiService.js";
import { huggingFaceService } from "../services/huggingFaceService.js";
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
// @route   POST /api/v1/trips
// @access  Private
export const createTrip = asyncHandler(async (req, res) => {
  console.log("Trip creation payload:", JSON.stringify(req.body));

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
    travelerCount,
    budgetTarget,
    exclusions,
    tripEndTime,
  } = req.body;

  try {
    if (!startDate && duration) {
      startDate = new Date();
      endDate = new Date(Date.now() + (Number(duration) - 1) * 24 * 60 * 60 * 1000);
    }

    if (!totalBudget && budget) {
      const durationDays = Number(duration) || 1;
      if (budget === "Cheap") totalBudget = 1500 * durationDays;
      else if (budget === "Moderate") totalBudget = 4000 * durationDays;
      else if (budget === "Luxury") totalBudget = 12000 * durationDays;
      else totalBudget = 2000 * durationDays;
    }

    const resolvedTravelerCount = Number(travelerCount || travelers || 1);
    if (!travelers && companions) {
      if (companions === "Just Me") travelers = 1;
      else if (companions === "A Couple") travelers = 2;
      else if (companions === "Family" || companions === "Friends") travelers = 4;
      else travelers = 1;
    }

    if (!startDate) startDate = new Date();
    if (!endDate) endDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    if (!totalBudget) totalBudget = 5000;
    if (!travelers) travelers = resolvedTravelerCount;

    if (!destination) {
      res.status(400);
      throw new Error("Destination is required.");
    }

    let coverImage = "";
    try {
      coverImage = await huggingFaceService.generateDestinationImage(destination);
    } catch (imgError) {
      console.error("Cover image generation failed:", imgError.message);
    }

    const trip = await Trip.create({
      user: req.user._id,
      destination,
      startDate,
      endDate,
      totalBudget,
      budget: budget || "Moderate",
      budgetTarget: Number(budgetTarget || totalBudget),
      travelers,
      travelerCount: resolvedTravelerCount,
      exclusions: exclusions || placesToAvoid || [],
      foodPreference,
      stayPreference,
      travelStyle,
      interests,
      placesToAvoid,
      specialNotes,
      tripEndTime: tripEndTime || "08:00 PM",
      coverImage,
      status: "Planned",
    });

    let aiWarning = null;
    try {
      const aiResult = await aiService.generateDetailedItinerary(trip);
      const itineraryDays = aiResult?.itineraryDays || [];
      const dayDates = getDaysArray(trip.startDate, trip.endDate);

      for (let i = 0; i < itineraryDays.length; i++) {
        const dayData = itineraryDays[i];
        const dayNumber = dayData.dayNumber || i + 1;
        const date = dayDates[i] || new Date(trip.startDate);

        const itinerary = await Itinerary.create({
          trip: trip._id,
          dayNumber,
          date,
          summary: dayData.summary || `Day ${dayNumber}: Highlights of ${destination}`,
          activities: [],
          staySuggestion: null,
          foodSuggestions: [],
        });

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

        const activityIds = [];
        for (const actData of dayData.activities || []) {
          const activity = await Activity.create({
            trip: trip._id,
            itinerary: itinerary._id,
            dayNumber,
            title: actData.title,
            description: actData.description || "",
            image: actData.image || "",
            timeSlot: actData.timeSlot || "Morning",
            time: actData.time || "",
            location: actData.location || destination,
            cost: actData.cost || 0,
            estimatedDuration: actData.estimatedDuration || 60,
            rationale: actData.rationale || "",
            transportDetails: actData.transportDetails || { mode: "None" },
            isAlternative: actData.isAlternative || false,
          });
          activityIds.push(activity._id);
        }

        itinerary.activities = activityIds;
        itinerary.staySuggestion = stayId;
        itinerary.foodSuggestions = foodIds;
        await itinerary.save();
      }

      trip.status = "Planned";
      trip.routeAlternatives = aiResult?.routeAlternatives || [];
      trip.selectedRouteAlternative = trip.routeAlternatives[0]?.id || null;
      await trip.save();
    } catch (aiError) {
      console.error("AI itinerary generation failed:", aiError.message);
      aiWarning = `Trip saved as Draft. AI itinerary generation failed: ${aiError.message}. You can regenerate the itinerary later.`;
    }

    return res.status(201).json({
      success: true,
      message: aiWarning || "Trip created and itinerary generated successfully.",
      data: trip,
    });
  } catch (error) {
    console.error("Trip creation error:", error);
    throw error;
  }
});

export const startTrip = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.tripId);
  if (!trip) {
    res.status(404);
    throw new Error("Trip not found.");
  }

  if (trip.user.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error("Not authorized to start this trip.");
  }

  const activities = await Activity.find({ trip: trip._id }).sort({ dayNumber: 1, orderIndex: 1, createdAt: 1 });
  const bucketPlaces = activities.map((activity) => ({
    name: activity.title,
    dayNumber: activity.dayNumber || 1,
    location: activity.location,
    lat: activity.location?.lat || 28.6129,
    lng: activity.location?.lng || 77.2295,
    minDuration: activity.estimatedDuration || 60,
    maxDuration: Math.max(activity.estimatedDuration || 60, 90),
    description: activity.description || "",
    rationale: activity.rationale || "",
  }));

  const baseUrl = (process.env.AI_SERVICE_URL || "https://wanderwise-ai-service.onrender.com").replace(/\/$/, "");

  const aiResponse = await fetch(`${baseUrl}/api/v1/ai/schedule-trip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      places: bucketPlaces,
      hotel_location: {
        lat: 28.6129,
        lng: 77.2295,
      },
      start_time: "09:00 AM",
      end_time: trip.tripEndTime || "08:00 PM",
    }),
  });

  const aiPayload = await aiResponse.json();
  const scheduledDays = aiPayload?.data?.days || [];

  for (const daySchedule of scheduledDays) {
    for (const item of (daySchedule.items || [])) {
      const activityMatch = activities.find((activity) => activity.title === item.name);
      if (!activityMatch) continue;

      await Activity.findByIdAndUpdate(
        activityMatch._id,
        {
          timeSlot: item.type === "lunch" ? "Afternoon" : item.type === "activity" ? activityMatch.timeSlot || "Morning" : undefined,
          time: item.startTime,
          orderIndex: item.orderIndex || 0,
          type: item.type || "activity",
          transportDetails: {
            mode: item.mode || "Cab",
            duration: item.durationMinutes ? `${item.durationMinutes} min` : "",
            cost: 0,
            routeDistance: item.distanceKm ? `${item.distanceKm} km` : "",
          },
        },
        { returnDocument: "after" }
      );
    }
  }

  trip.status = "Started";
  await trip.save();

  return res.status(200).json({
    success: true,
    message: "Trip started and itinerary scheduled.",
    data: {
      trip,
      schedule: scheduledDays,
    },
  });
});

// @desc    Get live timeline schedule for a trip
// @route   GET /api/v1/trips/:tripId/schedule
// @access  Private
export const getTripSchedule = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.tripId);
  if (!trip) {
    res.status(404);
    throw new Error("Trip not found.");
  }

  if (trip.user.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error("Not authorized to access this trip's schedule.");
  }

  const activities = await Activity.find({ trip: trip._id }).sort({ dayNumber: 1, orderIndex: 1, createdAt: 1 });
  const bucketPlaces = activities.map((activity) => ({
    name: activity.title,
    dayNumber: activity.dayNumber || 1,
    location: activity.location,
    lat: activity.location?.lat || 28.6129,
    lng: activity.location?.lng || 77.2295,
    minDuration: activity.estimatedDuration || 60,
    maxDuration: Math.max(activity.estimatedDuration || 60, 90),
    description: activity.description || "",
    rationale: activity.rationale || "",
  }));

  const baseUrl = (process.env.AI_SERVICE_URL || "https://wanderwise-ai-service.onrender.com").replace(/\/$/, "");

  const aiResponse = await fetch(`${baseUrl}/api/v1/ai/schedule-trip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      places: bucketPlaces,
      hotel_location: {
        lat: 28.6129,
        lng: 77.2295,
      },
      start_time: "09:00 AM",
      end_time: trip.tripEndTime || "08:00 PM",
    }),
  });

  const aiPayload = await aiResponse.json();
  const scheduledDays = aiPayload?.data?.days || [];

  return res.status(200).json({
    success: true,
    message: "Trip schedule retrieved.",
    data: {
      schedule: scheduledDays,
    },
  });
});

export const addTripExpense = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.tripId);
  if (!trip) {
    res.status(404);
    throw new Error("Trip not found.");
  }

  if (trip.user.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error("Not authorized to access this trip's expenses.");
  }

  const baseUrl = (process.env.AI_SERVICE_URL || "https://wanderwise-ai-service.onrender.com").replace(/\/$/, "");

  const fastApiResponse = await fetch(`${baseUrl}/api/v1/ai/expenses/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      trip_id: trip._id.toString(),
      ...req.body,
    }),
  });
  const fastApiPayload = await fastApiResponse.json();

  // Check remaining budget to send notification if negative
  try {
    const completedActivities = await Activity.find({ trip: trip._id, status: "Completed" });
    const activitySpent = completedActivities.reduce((sum, a) => sum + (a.cost || 0), 0);
    const plannedBudget = trip.budgetTarget || trip.totalBudget || 0;
    const summaryRes = await fetch(
      `${baseUrl}/api/v1/ai/expenses/summary/${trip._id}?planned_budget=${encodeURIComponent(plannedBudget)}&activity_spent=${encodeURIComponent(activitySpent)}`
    );
    const summaryPayload = await summaryRes.json();
    const remaining = summaryPayload?.data?.remaining_budget;

    if (remaining !== undefined && remaining < 0) {
      await Notification.create({
        user: trip.user,
        trip: trip._id,
        title: "Budget Alert: Limit Exceeded",
        message: `You have exceeded your planned budget for ${trip.destination}. Remaining balance is ₹${remaining}.`,
        type: "Budget"
      });
    }
  } catch (err) {
    console.error("Failed to verify remaining budget after expense:", err);
  }

  return res.status(200).json({
    success: true,
    message: "Expense logged.",
    data: fastApiPayload?.data || fastApiPayload,
  });
});

export const getTripExpensesSummary = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.tripId);
  if (!trip) {
    res.status(404);
    throw new Error("Trip not found.");
  }

  if (trip.user.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error("Not authorized to access this trip's expenses.");
  }

  // Aggregate costs of all Completed activities from MongoDB
  const completedActivities = await Activity.find({ trip: trip._id, status: "Completed" });
  const activitySpent = completedActivities.reduce((sum, a) => sum + (a.cost || 0), 0);


  const plannedBudget = trip.budgetTarget || trip.totalBudget || 0;
  const fastApiResponse = await fetch(
    `${process.env.AI_SERVICE_URL || "https://wanderwise-ai-service.onrender.com"}/api/v1/ai/expenses/summary/${trip._id}` +
    `?planned_budget=${encodeURIComponent(plannedBudget)}` +
    `&activity_spent=${encodeURIComponent(activitySpent)}`
  );
  const fastApiPayload = await fastApiResponse.json();

  return res.status(200).json({
    success: true,
    message: "Expense summary retrieved.",
    data: fastApiPayload?.data || fastApiPayload,
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
    returnDocument: "after",
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

// @desc    Update trip status (Draft -> Planned -> Started -> Completed)
// @route   PATCH /api/trips/:id/status
// @access  Private
export const updateTripStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  let trip = await Trip.findById(req.params.id);

  if (!trip) {
    res.status(404);
    throw new Error("Trip not found.");
  }

  if (trip.user.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error("Not authorized to modify this trip.");
  }

  if (status === "Started") {
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

  trip.status = status;
  await trip.save();

  return res.status(200).json({
    success: true,
    message: `Trip status updated to ${status}.`,
    data: trip,
  });
});

// @desc    Select active hotel route alternative
// @route   PATCH /api/v1/trips/:id/route-option
// @access  Private
export const selectRouteAlternative = asyncHandler(async (req, res) => {
  const { optionId } = req.body;
  const trip = await Trip.findById(req.params.id);

  if (!trip) {
    res.status(404);
    throw new Error("Trip not found.");
  }

  if (trip.user.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error("Not authorized to modify this trip.");
  }

  const selectedOption = (trip.routeAlternatives || []).find((opt) => opt.id === optionId);
  if (!selectedOption) {
    res.status(400);
    throw new Error("Invalid route option selected.");
  }

  trip.selectedRouteAlternative = optionId;
  await trip.save();

  const activitiesByDay = selectedOption.activitiesByDay || {};
  const itineraries = await Itinerary.find({ trip: trip._id });

  for (const itinerary of itineraries) {
    const dayKey = String(itinerary.dayNumber);
    const dayActivities = activitiesByDay[dayKey];
    if (!dayActivities) continue;

    await Activity.deleteMany({ itinerary: itinerary._id });
    const activityIds = [];

    for (const actData of dayActivities) {
      const activity = await Activity.create({
        trip: trip._id,
        itinerary: itinerary._id,
        dayNumber: itinerary.dayNumber,
        title: actData.title,
        description: actData.description || "",
        image: actData.image || "",
        timeSlot: actData.timeSlot || "Morning",
        time: actData.time || "",
        location: actData.location || trip.destination,
        cost: actData.cost || 0,
        estimatedDuration: actData.estimatedDuration || 60,
        rationale: actData.rationale || "",
        transportDetails: actData.transportDetails || { mode: "None" },
      });
      activityIds.push(activity._id);
    }

    itinerary.activities = activityIds;
    await itinerary.save();
  }

  return res.status(200).json({
    success: true,
    message: "Route option applied and itinerary updated.",
    data: trip,
  });
});

// @desc    Delete trip and all associated itinerary records
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

  // Delete all child models linked to this trip
  await Itinerary.deleteMany({ trip: trip._id });
  await Activity.deleteMany({ trip: trip._id });
  await StaySuggestion.deleteMany({ trip: trip._id });
  await FoodSuggestion.deleteMany({ trip: trip._id });

  await trip.deleteOne();

  return res.status(200).json({
    success: true,
    message: "Trip and all associated itinerary data removed successfully.",
    data: {},
  });
});
