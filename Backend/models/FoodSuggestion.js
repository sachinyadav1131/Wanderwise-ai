import mongoose from "mongoose";

const foodSuggestionSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: [true, "Trip reference is required."],
    },
    dayNumber: {
      type: Number,
      required: [true, "Day number is required."],
      min: 1,
    },
    mealType: {
      type: String,
      enum: ["Breakfast", "Lunch", "Dinner", "Snack/Cafe"],
      required: [true, "Meal type is required."],
    },
    nearPlace: {
      type: String, // e.g., "Khan Market", "Nizamuddin" (corresponds to route coordinates)
      required: [true, "Nearest reference place is required."],
      trim: true,
    },
    restaurantName: {
      type: String,
      required: [true, "Restaurant or Cafe name is required."],
      trim: true,
    },
    cuisineType: {
      type: String, // e.g., "Vegetarian North Indian", "Continental Cafe"
      trim: true,
    },
    costEstimate: {
      type: String, // e.g., "Rs. 250-500 per person"
      trim: true,
    },
    averagePrice: {
      type: Number, // Numeric representation for budget summary calculations
      default: 0,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    distanceFromRoute: {
      type: String, // e.g., "300m walking distance from Khan Market"
      default: "",
    },
    rationale: {
      type: String, // Why this is recommended (e.g., "Top-rated vegetarian food on your lunch route.")
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    isSelected: {
      type: Boolean,
      default: false, // Set to true if the user decides to choose this recommendation
    },
  },
  {
    timestamps: true,
  }
);

export const FoodSuggestion = mongoose.model("FoodSuggestion", foodSuggestionSchema);