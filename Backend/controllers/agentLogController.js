import { AgentLog } from "../models/AgentLog.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// @desc    Get agent logs for a trip
// @route   GET /api/v1/agent-logs/trip/:tripId
// @access  Private
export const getAgentLogs = asyncHandler(async (req, res) => {
  const logs = await AgentLog.find({ trip: req.params.tripId }).sort({ createdAt: -1 });
  return res.status(200).json({
    success: true,
    count: logs.length,
    data: logs,
  });
});
