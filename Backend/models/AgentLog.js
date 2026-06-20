import mongoose from "mongoose";

const agentLogSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
    },
    agentName: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    reasoning: {
      type: String,
      required: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

export const AgentLog = mongoose.model("AgentLog", agentLogSchema);
