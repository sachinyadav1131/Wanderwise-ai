import express from "express";
import { sendMessage, getChatHistory } from "../controllers/chatController.js";
import { isAuthenticated } from "../middleware/authMiddleware.js";

const router = express.Router();

// Enforce auth check for all chatbot routes
router.use(isAuthenticated);

router.post("/message", sendMessage);
router.get("/trip/:tripId", getChatHistory);

export default router;
