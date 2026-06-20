import express from "express";
import { getAgentLogs } from "../controllers/agentLogController.js";
import { isAuthenticated } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(isAuthenticated);

router.get("/trip/:tripId", getAgentLogs);

export default router;
