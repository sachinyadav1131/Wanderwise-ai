import mongoose from "mongoose";

const tripSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    destination: {
      type: String,
      required: [true, "Destination is required."],
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required."],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required."],
    },
    totalBudget: {
      type: Number,
      required: [true, "Total budget is required."],
      min: [0, "Budget cannot be negative."],
    },
    travelers: {
      type: Number,
      default: 1,
      min: [1, "Number of travelers must be at least 1."],
    },
    foodPreference: {
      type: String,
      default: "Any",
    },
    stayPreference: {
      type: String,
      default: "Any",
    },
    travelStyle: {
      type: String,
      enum: ["Relaxed", "Moderate", "Fast-paced"],
      default: "Moderate",
    },
    interests: {
      type: [String],
      default: [],
    },
    placesToAvoid: {
      type: [String],
      default: [],
    },
    specialNotes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Draft", "Planned", "Started", "Completed"],
      default: "Draft", // Sets to Draft upon basic initialization
    },
  },
  {
    timestamps: true,
  }
);

export const Trip = mongoose.model("Trip", tripSchema);