import mongoose from "mongoose";

const changeSuggestionSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    triggerType: {
      type: String,
      enum: ["Chat", "Weather", "AI-Replan"],
      required: true,
    },
    reason: {
      type: String,
    },
    generatedSummary: {
      type: String,
      required: true,
    },
    estimatedBudgetImpact: {
      type: Number,
      default: 0,
    },
    estimatedTimeImpact: {
      type: Number, // in minutes
      default: 0,
    },
    beforeSnapshot: {
      activities: [mongoose.Schema.Types.Mixed],
      staySuggestions: [mongoose.Schema.Types.Mixed],
      foodSuggestions: [mongoose.Schema.Types.Mixed],
    },
    afterSnapshot: {
      activities: [mongoose.Schema.Types.Mixed],
      staySuggestions: [mongoose.Schema.Types.Mixed],
      foodSuggestions: [mongoose.Schema.Types.Mixed],
    },
    suggestedChanges: {
      activities: [
        {
          action: {
            type: String,
            enum: ["ADD", "UPDATE", "DELETE"],
            required: true,
          },
          activityId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Activity",
            default: null,
          },
          data: mongoose.Schema.Types.Mixed,
        },
      ],
      staySuggestions: [
        {
          action: {
            type: String,
            enum: ["UPDATE"],
            required: true,
          },
          stayId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "StaySuggestion",
          },
          selectedOption: mongoose.Schema.Types.Mixed,
        },
      ],
      foodSuggestions: [
        {
          action: {
            type: String,
            enum: ["ADD", "DELETE"],
            required: true,
          },
          foodId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "FoodSuggestion",
          },
          data: mongoose.Schema.Types.Mixed,
        },
      ],
    },
  },
  { timestamps: true }
);

// Compound index to quickly fetch pending suggestions for a trip
changeSuggestionSchema.index({ trip: 1, status: 1 });

export const ChangeSuggestion = mongoose.model("ChangeSuggestion", changeSuggestionSchema);
