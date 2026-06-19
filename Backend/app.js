import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser"; // Ensure this is installed: npm install cookie-parser
import authRoutes from "./routes/authRoutes.js";
import tripRoutes from "./routes/tripRoutes.js";
import itineraryRoutes from "./routes/itineraryRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";

export const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/trips", tripRoutes);
app.use("/api/v1/itineraries", itineraryRoutes);
app.use("/api/v1/activities", activityRoutes);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Wanderwise AI backend is running",
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server health check passed",
  });
});

app.use(errorMiddleware);