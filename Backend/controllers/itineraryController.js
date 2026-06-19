import { Trip } from "../models/Trip.js";
import { Itinerary } from "../models/Itinerary.js";
import { Activity } from "../models/Activity.js";
import { StaySuggestion } from "../models/StaySuggestion.js";
import { FoodSuggestion } from "../models/FoodSuggestion.js";
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

// @desc    Generate a mock itinerary based on trip parameters (Phase 3)
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

  // Get dates array
  const dayDates = getDaysArray(trip.startDate, trip.endDate);
  const totalDays = dayDates.length;

  const generatedItineraries = [];

  // 2. Generate Day-by-Day Mock Data
  for (let i = 0; i < totalDays; i++) {
    const dayNumber = i + 1;
    const date = dayDates[i];

    // Create the Base Itinerary Document
    const itinerary = await Itinerary.create({
      trip: tripId,
      dayNumber,
      date,
      summary: `Day ${dayNumber}: Highlights of ${trip.destination}`,
      activities: [],
      staySuggestion: null,
      foodSuggestions: [],
    });

    // Create Stay Suggestion for this day (Smart Stay Optimizer)
    const stay = await StaySuggestion.create({
      trip: tripId,
      dayNumber,
      locationArea: "Connaught Place/Paharganj",
      rationale: "Central location, highly connected via metro, and budget-friendly hostel options.",
      options: [
        {
          name: "Smyle Inn Hostel",
          type: "Hostel",
          pricePerNight: 950,
          rating: 4.2,
          distanceFromRoute: "1.2 km from New Delhi Railway Station",
          foodNearby: ["Sita Ram Diwan Chand", "My Bar Headquarters"],
          features: ["Free Wi-Fi", "AC", "24/7 Reception", "Social Common Room"],
          address: "Paharganj, New Delhi",
        },
        {
          name: "Bloom Boutique CP",
          type: "Hotel",
          pricePerNight: 2800,
          rating: 4.5,
          distanceFromRoute: "0.5 km from Connaught Place Outer Circle",
          foodNearby: ["Saravana Bhavan", "Wenger's"],
          features: ["Free Wi-Fi", "AC", "Hot Water", "Buffet Breakfast"],
          address: "Connaught Place, New Delhi",
        },
      ],
      selectedOption: {
        name: "Smyle Inn Hostel",
        pricePerNight: 950,
        type: "Hostel",
      },
    });

    // Create Food Suggestions for this day
    const lunchFood = await FoodSuggestion.create({
      trip: tripId,
      dayNumber,
      mealType: "Lunch",
      nearPlace: "Khan Market",
      restaurantName: "Khan Chacha",
      cuisineType: "Vegetarian Rolls & Mughlai",
      costEstimate: "Rs. 250-400 per person",
      averagePrice: 300,
      rating: 4.3,
      distanceFromRoute: "150m walking distance from Khan Market metro exit",
      rationale: "Iconic local food option, very close to Lodhi Garden path.",
    });

    const dinnerFood = await FoodSuggestion.create({
      trip: tripId,
      dayNumber,
      mealType: "Dinner",
      nearPlace: "Connaught Place",
      restaurantName: "Saravana Bhavan",
      cuisineType: "South Indian Vegetarian",
      costEstimate: "Rs. 300-500 per person",
      averagePrice: 400,
      rating: 4.6,
      distanceFromRoute: "Center of Connaught Place Outer Circle",
      rationale: "Highly rated, fits the vegetarian and budget profile perfectly.",
    });

    // Create Activities for this day (Detailed checklist)
    const activitiesToCreate = [
      {
        title: "Start from hostel near Paharganj",
        description: "Begin the day early and head towards Central Delhi.",
        timeSlot: "Morning",
        time: "08:30 AM",
        location: "Paharganj Hostel",
        cost: 0,
        estimatedDuration: 30,
        transportDetails: { mode: "None" },
      },
      {
        title: "Visit India Gate",
        description: "Walk around the national monument and enjoy the morning breeze.",
        timeSlot: "Morning",
        time: "09:00 AM",
        location: "India Gate",
        cost: 0,
        estimatedDuration: 60,
        transportDetails: {
          mode: "Auto",
          duration: "15-25 min",
          cost: 150,
          routeDistance: "4.5 km",
        },
      },
      {
        title: "Visit Humayun's Tomb",
        description: "Explore the UNESCO World Heritage site and Mughal gardens.",
        timeSlot: "Morning",
        time: "10:30 AM",
        location: "Humayun's Tomb",
        cost: 40, // Entry ticket
        estimatedDuration: 90,
        transportDetails: {
          mode: "Cab",
          duration: "20-30 min",
          cost: 240,
          routeDistance: "6.2 km",
        },
      },
      {
        title: "Lunch near Khan Market",
        description: `Enjoy a meal at ${lunchFood.restaurantName}.`,
        timeSlot: "Afternoon",
        time: "12:45 PM",
        location: "Khan Market",
        cost: 350,
        estimatedDuration: 60,
        transportDetails: {
          mode: "Auto",
          duration: "10-15 min",
          cost: 100,
          routeDistance: "3.0 km",
        },
      },
      {
        title: "Visit Lodhi Garden",
        description: "Relaxing walk amidst historic tombs and lush greenery.",
        timeSlot: "Afternoon",
        time: "02:00 PM",
        location: "Lodhi Garden",
        cost: 0,
        estimatedDuration: 90,
        transportDetails: {
          mode: "Walking",
          duration: "15 min",
          cost: 0,
          routeDistance: "1.1 km",
        },
      },
      {
        title: "Explore Janpath Market",
        description: "Shopping for handicraft, clothes, and snacks.",
        timeSlot: "Afternoon",
        time: "04:00 PM",
        location: "Janpath",
        cost: 200, // Budget snack buffer
        estimatedDuration: 120,
        transportDetails: {
          mode: "Metro",
          duration: "15 min",
          cost: 30,
          routeDistance: "2.8 km",
        },
      },
      {
        title: "Connaught Place evening walk",
        description: "Stroll around the Georgian-style corridors of CP.",
        timeSlot: "Evening",
        time: "06:30 PM",
        location: "Connaught Place",
        cost: 0,
        estimatedDuration: 90,
        transportDetails: {
          mode: "Walking",
          duration: "10 min",
          cost: 0,
          routeDistance: "0.7 km",
        },
      },
      {
        title: "Dinner at CP",
        description: `Dine at ${dinnerFood.restaurantName}.`,
        timeSlot: "Evening",
        time: "08:00 PM",
        location: "Connaught Place Outer Circle",
        cost: 450,
        estimatedDuration: 75,
        transportDetails: { mode: "None" },
      },
      {
        title: "Return to stay",
        description: "Head back to the hostel to rest.",
        timeSlot: "Night",
        time: "09:30 PM",
        location: "Paharganj Hostel",
        cost: 0,
        estimatedDuration: 30,
        transportDetails: {
          mode: "Auto",
          duration: "15 min",
          cost: 120,
          routeDistance: "2.1 km",
        },
      },
    ];

    const createdActivities = [];
    for (const act of activitiesToCreate) {
      const dbActivity = await Activity.create({
        ...act,
        trip: tripId,
        itinerary: itinerary._id,
        dayNumber,
      });
      createdActivities.push(dbActivity._id);
    }

    // 3. Update Itinerary links
    itinerary.activities = createdActivities;
    itinerary.staySuggestion = stay._id;
    itinerary.foodSuggestions = [lunchFood._id, dinnerFood._id];
    await itinerary.save();

    generatedItineraries.push(itinerary);
  }

  // 4. Update the Trip status to "Planned"
  trip.status = "Planned";
  await trip.save();

  return res.status(200).json({
    success: true,
    message: `Mock itinerary for ${totalDays} day(s) generated successfully.`,
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