import express from "express";
import {
  generateItinerary,
  getItineraryByTripId,
} from "../controllers/itineraryController.js";
import { isAuthenticated } from "../middleware/authMiddleware.js";

const router = express.Router();

// All itinerary endpoints require authentication
router.use(isAuthenticated);

// Generate itinerary for a trip
router.post("/generate/:tripId", generateItinerary);

// Get day-wise itinerary and checklist for a specific trip
router.get("/trip/:tripId", getItineraryByTripId);

export default router;