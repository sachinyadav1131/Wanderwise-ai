import dotenv from "dotenv";

import { app } from "./app.js";
import { connectDB } from "./Database/db.js";

dotenv.config({ path: "./config/config.env" });

const PORT = process.env.PORT || 5000;

connectDB();

app.listen(PORT, () => {
  console.log(`Wanderwise backend running on port ${PORT}`);
});
