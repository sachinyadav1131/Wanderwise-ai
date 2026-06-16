import express from "express";
import {
    register,
    verifyOTP,
    login,
    logout,
    getUser,
    forgotPassword,
    resetPassword,
    updatePassword
} from "../controllers/authController.js";

// Note: Using "middleware" (singular) to strictly match the Wanderwise PDF folder structure
import { isAuthenticated } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public Authentication Routes
router.post("/register", register);
router.post("/verify-otp", verifyOTP); // RESTful convention: using hyphen instead of underscore
router.post("/login", login);

// Protected Routes (Requires a valid JWT)
router.get("/logout", isAuthenticated, logout);
router.get("/me", isAuthenticated, getUser);
router.put("/password/update", isAuthenticated, updatePassword);

// Password Recovery Routes (Public)
router.post("/password/forgot", forgotPassword);
router.put("/password/reset/:token", resetPassword);

export default router;