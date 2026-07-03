import express from "express";
import { checkWeatherAndReplan } from "../controllers/weatherController.js";
import { isAuthenticated } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(isAuthenticated);

router.post("/check/:tripId", checkWeatherAndReplan);

export default router;
