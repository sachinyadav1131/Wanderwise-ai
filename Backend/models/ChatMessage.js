import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
    },
    sender: {
      type: String,
      enum: ["User", "AI"],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    changeSuggestion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChangeSuggestion",
      default: null,
    },
  },
  { timestamps: true }
);

export const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
