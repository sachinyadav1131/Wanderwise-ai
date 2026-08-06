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
    budget: {
      type: String,
      default: "Moderate",
      trim: true,
    },
    budgetTarget: {
      type: Number,
      default: null,
      min: [0, "Budget target cannot be negative."],
    },
    travelers: {
      type: Number,
      default: 1,
      min: [1, "Number of travelers must be at least 1."],
    },
    travelerCount: {
      type: Number,
      default: 1,
      min: [1, "Number of travelers must be at least 1."],
    },
    exclusions: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    routeAlternatives: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    selectedRouteAlternative: {
      type: String,
      default: null,
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
    tripEndTime: {
      type: String,
      default: "08:00 PM",
      trim: true,
    },
    coverImage: {
      type: String,
    },
    status: {
      type: String,
      enum: ["Draft", "Planned", "Started", "Completed"],
      default: "Planned",
    },
  },
  {
    timestamps: true,
  }
);

export const Trip = mongoose.model("Trip", tripSchema);
