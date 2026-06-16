import dotenv from "dotenv";
dotenv.config({ path: "./config/config.env" });

import { app } from "./app.js";
import { connectDB } from "./Database/db.js";
const PORT = process.env.PORT || 5000;

try {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`Wanderwise backend running on port ${PORT}`);
  });
} catch (error) {
  console.error("Database connection failed:", error.message);
  process.exit(1);
}