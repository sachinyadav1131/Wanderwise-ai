import mongoose from "mongoose";
import jwt from "jsonwebtoken"; 
import crypto from "crypto";
import bcrypt from "bcryptjs"; // Required for security

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    defaultPreferences: {
      foodPreference: {
        type: String,
        default: 'Any'
      },
      stayPreference: {
        type: String,
        default: 'Any'
      },
      travelStyle: {
        type: String,
        enum: ['Relaxed', 'Moderate', 'Fast-paced'],
        default: 'Moderate'
      }
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationCode: {
      type: Number,
      select: false
    },
    verificationCodeExpire: {
      type: Date,
      select: false
    },
    resetPasswordToken: String,
    resetPasswordTokenExpire: Date,
  },
  {
    timestamps: true
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.generateVerificationCode = function(){
    function generateRandomFiveDigitNumber(){
        const firstDigit = Math.floor(Math.random()*9)+1;
        const remainingDigits = Math.floor(Math.random()*10000)
        .toString()
        .padStart(4,0);
        return parseInt(firstDigit+remainingDigits);
    }
    const verificationCode = generateRandomFiveDigitNumber();
    this.verificationCode = verificationCode;
    this.verificationCodeExpire = Date.now() + 15*60*1000; // Expiry 15 minutes
    return verificationCode;
};

userSchema.methods.getJWTToken = function(){
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, {
        expiresIn: process.env.JWT_EXPIRE,
    });
};

userSchema.methods.getResetPasswordToken  = function(){
    const resetToken = crypto.randomBytes(20).toString("hex");
    this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
    
    this.resetPasswordTokenExpire = Date.now()+ 30*60*1000;
    return resetToken;
};

export const User = mongoose.model("User", userSchema);