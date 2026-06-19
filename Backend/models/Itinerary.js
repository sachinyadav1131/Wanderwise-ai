import mongoose from "mongoose";

const itinerarySchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: [true, "Trip reference is required."],
    },
    dayNumber: {
      type: Number,
      required: [true, "Day number is required."],
      min: [1, "Day number must be at least 1."],
    },
    date: {
      type: Date,
      required: [true, "Date for the itinerary day is required."],
    },
    summary: {
      type: String,
      trim: true,
      default: "", // Briefly describes what this day is about (e.g., "Exploring Old Delhi monuments")
    },
    activities: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Activity",
      },
    ],
    staySuggestion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StaySuggestion",
      default: null,
    },
    foodSuggestions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FoodSuggestion",
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure that for a given trip, dayNumber is unique
itinerarySchema.index({ trip: 1, dayNumber: 1 }, { unique: true });

export const Itinerary = mongoose.model("Itinerary", itinerarySchema);