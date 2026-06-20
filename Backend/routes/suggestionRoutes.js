import express from "express";
import { getSuggestionsByTrip, approveSuggestion, rejectSuggestion } from "../controllers/suggestionController.js";
import { isAuthenticated } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(isAuthenticated);

router.get("/trip/:tripId", getSuggestionsByTrip);
router.post("/:id/approve", approveSuggestion);
router.post("/:id/reject", rejectSuggestion);

export default router;
