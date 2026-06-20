import express from "express";
import { getNotifications, markAsRead } from "../controllers/notificationController.js";
import { isAuthenticated } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(isAuthenticated);

router.get("/", getNotifications);
router.patch("/:id/read", markAsRead);

export default router;
