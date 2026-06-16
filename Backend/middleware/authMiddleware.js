import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { catchAsyncErrors as asyncHandler } from "../utils/asyncHandler.js";
import ErrorHandler from "./errorMiddleware.js";

export const isAuthenticated = asyncHandler(async (req, res, next) => {
    // We expect the token to be stored in an HTTP-only cookie named "token"
    const { token } = req.cookies;

    if (!token) {
        return next(new ErrorHandler("Please log in to access this resource.", 401));
    }

    try {
        const decodedData = jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.user = await User.findById(decodedData.id);

        if (!req.user) {
            return next(new ErrorHandler("User associated with this token no longer exists.", 401));
        }

        next();
    } catch (error) {
        return next(new ErrorHandler("Invalid or expired token. Please log in again.", 401));
    }
});