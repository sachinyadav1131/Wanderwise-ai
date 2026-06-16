import { User } from "../models/User.js";
import crypto from "crypto";
import { catchAsyncErrors as asyncHandler } from "../utils/asyncHandler.js";
import ErrorHandler from "../middleware/errorMiddleware.js"; 
import { 
    sendEmail, 
    generateVerificationOtpEmailTemplate, 
    generateForgotPasswordEmailTemplate 
} from "../services/emailService.js"; 
import { sendToken } from "../utils/apiResponse.js"; 

export const register = asyncHandler(async (req, res, next) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return next(new ErrorHandler("Please enter all fields.", 400));
    }

    // Check if fully registered and verified
    const isRegistered = await User.findOne({ email, isVerified: true });
    if (isRegistered) {
        return next(new ErrorHandler("User already exists.", 400));
    }

    const registrationAttemptsByUser = await User.find({
        email,
        isVerified: false,
    });

    if (registrationAttemptsByUser.length >= 5) {
        return next(
            new ErrorHandler(
                "You have exceeded the number of registration attempts. Please contact support.",
                400
            )
        );
    }

    if (password.length < 8 || password.length > 16) {
        return next(
            new ErrorHandler("Password must be between 8 and 16 characters.", 400)
        );
    }
    const user = new User({
        name,
        email,
        password, 
    });

    const verificationCode = await user.generateVerificationCode();
    await user.save();

    // UPDATED: Now using the HTML template from emailService.js
    const message = generateVerificationOtpEmailTemplate(verificationCode);
    
    try {
        await sendEmail({
            email: user.email,
            subject: "Wanderwise AI - Account Verification",
            message,
        });
        
        res.status(200).json({
            success: true,
            message: `Verification OTP sent to ${email}`,
        });
    } catch (error) {
        return next(new ErrorHandler("Failed to send verification email.", 500));
    }
});

export const verifyOTP = asyncHandler(async (req, res, next) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return next(new ErrorHandler("Please enter all fields.", 400));
    }

    // THE FIX: Added .select("+verificationCode +verificationCodeExpire") right before .sort()
    const userAllEntries = await User.find({
        email,
        isVerified: false,
    }).select("+verificationCode +verificationCodeExpire").sort({ createdAt: -1 });

    if (!userAllEntries || userAllEntries.length === 0) {
        return next(new ErrorHandler("No registration attempt found for this email.", 404));
    }

    let user;
    if (userAllEntries.length > 1) {
        user = userAllEntries[0];
        await User.deleteMany({
            _id: { $ne: user._id },
            isVerified: false,
            email,
        });
    } else {
        user = userAllEntries[0];
    }

    if (user.verificationCode !== Number(otp)) {
        return next(new ErrorHandler("Invalid OTP. Please try again.", 400));
    }

    const currentTime = Date.now();
    const verificationCodeExpire = new Date(user.verificationCodeExpire).getTime();
    
    if (currentTime > verificationCodeExpire) {
        return next(new ErrorHandler("OTP has expired. Please request a new one.", 400));
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpire = undefined;
    
    await user.save({ validateModifiedOnly: true });

    sendToken(user, 200, "Account verified successfully.", res);
});

export const login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return next(new ErrorHandler("Please enter all fields.", 400));
    }

    const user = await User.findOne({ email, isVerified: true }).select("+password");

    if (!user) {
        return next(new ErrorHandler("Invalid credentials or account not verified.", 400));
    }

    const isPasswordMatched = await user.matchPassword(password);
    
    if (!isPasswordMatched) {
        return next(new ErrorHandler("Invalid Password! Try Again.", 400));
    }

    sendToken(user, 200, "User logged in successfully.", res);
});

export const logout = asyncHandler(async (req, res, next) => {
    res.status(200).cookie("token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
    }).json({
        success: true,
        message: "Logged out successfully.",
    });
});

export const getUser = asyncHandler(async (req, res, next) => {
    const user = req.user;
    res.status(200).json({
        success: true,
        user,
    });
});

export const forgotPassword = asyncHandler(async (req, res, next) => {
    if (!req.body.email) {
        return next(new ErrorHandler("Please enter your email address.", 400));
    }

    const user = await User.findOne({
        email: req.body.email,
        isVerified: true,
    });

    if (!user) {
        return next(new ErrorHandler("User not found with this email.", 404));
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateModifiedOnly: true });

    const resetPasswordUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    
    // UPDATED: Now using the HTML template from emailService.js
    const message = generateForgotPasswordEmailTemplate(resetPasswordUrl);

    try {
        await sendEmail({
            email: user.email,
            subject: "Wanderwise AI Password Reset Request",
            message,
        });
        res.status(200).json({
            success: true,
            message: `Email sent to ${user.email} with password reset instructions.`,
        });
    } catch (error) {
        user.resetPasswordToken = undefined;
        user.resetPasswordTokenExpire = undefined;
        await user.save({ validateBeforeSave: false });
        return next(new ErrorHandler(error.message, 500));
    }
});

export const resetPassword = asyncHandler(async (req, res, next) => {
    const { token } = req.params;
    const resetPasswordToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordTokenExpire: { $gt: Date.now() },
    });

    if (!user) {
        return next(new ErrorHandler("Reset password token is invalid or expired.", 400));
    }

    if (req.body.password !== req.body.confirmPassword) {
        return next(new ErrorHandler("Passwords do not match.", 400));
    }

    if (req.body.password.length < 8 || req.body.password.length > 16) {
        return next(new ErrorHandler("Password must be between 8 and 16 characters.", 400));
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordTokenExpire = undefined;

    await user.save({ validateModifiedOnly: true });

    sendToken(user, 200, "Password reset successfully", res);
});

export const updatePassword = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user._id).select("+password");
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
        return next(new ErrorHandler("Please enter all fields.", 400));
    }

    const isPasswordMatched = await user.matchPassword(currentPassword);
    
    if (!isPasswordMatched) {
        return next(new ErrorHandler("Current password is incorrect.", 400));
    }

    if (newPassword.length < 8 || newPassword.length > 16) {
        return next(new ErrorHandler("Password must be between 8 and 16 characters.", 400));
    }

    if (newPassword !== confirmNewPassword) {
        return next(new ErrorHandler("New password and confirm password do not match.", 400));
    }

    user.password = newPassword;
    await user.save({ validateModifiedOnly: true });

    res.status(200).json({
        success: true,
        message: "Password updated successfully.",
    });
});