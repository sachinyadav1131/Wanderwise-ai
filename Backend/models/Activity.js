import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: [true, "Trip reference is required."],
    },
    itinerary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Itinerary",
      required: [true, "Itinerary reference is required."],
    },
    dayNumber: {
      type: Number,
      required: [true, "Day number is required."],
      min: 1,
    },
    title: {
      type: String,
      required: [true, "Activity title is required."],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    timeSlot: {
      type: String,
      enum: ["Morning", "Afternoon", "Evening", "Night"],
      required: [true, "Time slot (Morning, Afternoon, Evening, Night) is required."],
    },
    time: {
      type: String, // Exact time representation (e.g., "09:00 AM", "12:45 PM")
      trim: true,
    },
    location: {
      type: String,
      required: [true, "Activity location/place name is required."],
      trim: true,
    },
    cost: {
      type: Number,
      default: 0,
      min: [0, "Cost cannot be negative."],
    },
    estimatedDuration: {
      type: Number, // duration in minutes (e.g., 60 for 1 hour)
      default: 60,
    },
    status: {
      type: String,
      enum: ["Pending", "Completed", "Skipped", "Moved"],
      default: "Pending",
    },
    transportDetails: {
      mode: {
        type: String, // e.g., "Cab", "Metro", "Bus", "Auto", "Walking"
        enum: ["Cab", "Metro", "Bus", "Auto", "Walking", "None"],
        default: "None",
      },
      duration: {
        type: String, // e.g., "15-25 min"
        default: "",
      },
      cost: {
        type: Number, // Estimated transport fare
        default: 0,
      },
      routeDistance: {
        type: String, // e.g., "3.5 km"
        default: "",
      },
    },
    isAlternative: {
      type: Boolean,
      default: false, // Set to true if this is a weather/delay-based backup place suggested by AI
    },
    originalActivity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Activity",
      default: null, // Points to the original activity if this was swapped as an alternative
    },
  },
  {
    timestamps: true,
  }
);

export const Activity = mongoose.model("Activity", activitySchema);