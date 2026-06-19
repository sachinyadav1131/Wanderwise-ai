import express from "express";
import {
  updateActivityStatus,
  getActivityDetails,
} from "../controllers/activityController.js";
import { isAuthenticated } from "../middleware/authMiddleware.js";

const router = express.Router();

// Enforce authentication for all activity actions
router.use(isAuthenticated);

// Route for getting and patching individual activities
router.route("/:id").get(getActivityDetails);
router.route("/:id/status").patch(updateActivityStatus);

export default router;
