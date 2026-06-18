import express from "express";
import {
  createTrip,
  getUpcomingTrips,
  getCompletedTrips,
  editTrip,
} from "../controllers/tripController.js";
import { isAuthenticated } from "../middleware/authMiddleware.js"; 

const router = express.Router();

// All trip paths require authentication
router.use(isAuthenticated);

router.route("/").post(createTrip);
router.route("/upcoming").get(getUpcomingTrips);
router.route("/completed").get(getCompletedTrips);
router.route("/:id").put(editTrip);

export default router;