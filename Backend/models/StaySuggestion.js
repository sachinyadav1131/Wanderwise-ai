import mongoose from "mongoose";

const hotelOptionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Hotel/Hostel name is required."],
    trim: true,
  },
  type: {
    type: String, // e.g., "Hotel", "Hostel", "Resort", "4-Star Hotel", "Guest House", "Homestay"
    required: [true, "Accommodation type is required."],
  },
  pricePerNight: {
    type: Number,
    required: [true, "Price per night is required."],
    min: [0, "Price cannot be negative."],
  },
  rating: {
    type: Number,
    min: [0, "Rating cannot be less than 0."],
    max: [5, "Rating cannot exceed 5."],
    default: 0,
  },
  distanceFromRoute: {
    type: String, // e.g., "0.8 km from Connaught Place" or "1.5 km from route center"
    default: "",
  },
  foodNearby: {
    type: [String], // Recommends close dining options to enhance stay comfort
    default: [],
  },
  features: {
    type: [String], // e.g., ["Free Wi-Fi", "AC", "Breakfast Included", "Near Metro"]
    default: [],
  },
  address: {
    type: String,
    trim: true,
  },
  bookingUrl: {
    type: String,
    trim: true,
    default: "",
  },
});

const staySuggestionSchema = new mongoose.Schema(
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
    locationArea: {
      type: String,
      required: [true, "Suggested location area is required."], // e.g., "Connaught Place/Paharganj"
      trim: true,
    },
    rationale: {
      type: String, // Why this area is recommended based on the daily route (e.g., "Central, connected by metro, close to Day 1 activities")
      trim: true,
    },
    options: [hotelOptionSchema], // List of hotel/hostel suggestions
    selectedOption: {
      name: String,
      pricePerNight: Number,
      type: {
        type: String, // Free-form to accept any AI-generated accommodation type
      },
      bookingUrl: String,
    },
  },
  {
    timestamps: true,
  }
);

export const StaySuggestion = mongoose.model("StaySuggestion", staySuggestionSchema);