import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../models/User.js";
import { Trip } from "../models/Trip.js";
import { Itinerary } from "../models/Itinerary.js";
import { Activity } from "../models/Activity.js";
import { ChangeSuggestion } from "../models/ChangeSuggestion.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { aiService } from "../services/aiService.js";
import { approveSuggestion } from "../controllers/suggestionController.js";

dotenv.config({ path: "./config/config.env" });

async function runTests() {
  console.log("-----------------------------------------");
  console.log("Starting Phase 5 Integration Tests...");
  console.log("-----------------------------------------");

  // Connect to DB
  await mongoose.connect(process.env.MONGO_URI, {
    dbName: "Wanderwise-ai",
  });
  console.log("Database connected.");

  // Clear existing test documents
  await User.deleteMany({ email: "test_integration@wanderwise.com" });
  await Trip.deleteMany({ destination: "Integration Test City" });
  await ChangeSuggestion.deleteMany({});
  await ChatMessage.deleteMany({});

  // 1. Seed base user and trip
  const user = await User.create({
    name: "Test User",
    email: "test_integration@wanderwise.com",
    password: "hashedpassword123",
    isVerified: true,
  });

  const trip = await Trip.create({
    user: user._id,
    destination: "Integration Test City",
    startDate: new Date(),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    totalBudget: 5000,
    status: "Started",
  });

  const itinerary = await Itinerary.create({
    trip: trip._id,
    dayNumber: 1,
    date: new Date(),
    summary: "Day 1 Highlights",
    activities: [],
  });

  const act1 = await Activity.create({
    trip: trip._id,
    itinerary: itinerary._id,
    dayNumber: 1,
    title: "Visit India Gate",
    timeSlot: "Morning",
    location: "India Gate",
  });

  itinerary.activities.push(act1._id);
  await itinerary.save();

  console.log("Seeding complete. User, Trip, Itinerary, and India Gate activity created.");

  // 2. Test AI Chat Triggering ChangeSuggestion
  console.log("\nTesting Chat suggestion generation...");
  await ChatMessage.create({
    trip: trip._id,
    sender: "User",
    message: "It is going to rain today. What should I do?",
  });
  const chatResult = await aiService.processChatMessage(trip, "It is going to rain today. What should I do?");
  
  if (!chatResult.suggestionId) {
    throw new Error("FAIL: Suggestion was not generated.");
  }
  console.log("PASS: Suggestion generated successfully. ID:", chatResult.suggestionId);

  const suggestion = await ChangeSuggestion.findById(chatResult.suggestionId);
  if (suggestion.status !== "Pending" || suggestion.estimatedBudgetImpact !== 20) {
    throw new Error("FAIL: Suggestion schema values are incorrect.");
  }
  console.log("PASS: ChangeSuggestion created with Pending status and snapshots.");

  // 3. Test Idempotent Approval
  console.log("\nTesting suggestion approval...");
  let resolveApproval1;
  const approvalPromise1 = new Promise(resolve => { resolveApproval1 = resolve; });

  const mockRes = {
    statusCode: 200,
    status: function (code) {
      this.statusCode = code;
      return this;
    },
    json: function (obj) {
      this.body = obj;
      resolveApproval1();
      return this;
    },
  };

  const mockReq = {
    params: { id: suggestion._id },
    user: { _id: user._id },
  };

  const nextSpy = (err) => {
    if (err) throw err;
  };

  approveSuggestion(mockReq, mockRes, nextSpy);
  await approvalPromise1;
  
  if (mockRes.statusCode !== 200 || !mockRes.body.success) {
    throw new Error(`FAIL: Approval failed with status ${mockRes.statusCode}`);
  }
  console.log("PASS: First approval returned success. Checking DB updates...");

  // Verify DB changes applied
  const updatedAct1 = await Activity.findById(act1._id);
  if (updatedAct1.status !== "Moved" || updatedAct1.dayNumber !== 2) {
    throw new Error("FAIL: India Gate activity was not moved to Day 2.");
  }
  console.log("PASS: India Gate successfully shifted to Day 2.");

  const newActivity = await Activity.findOne({ trip: trip._id, title: "Visit National Museum" });
  if (!newActivity) {
    throw new Error("FAIL: Visit National Museum activity was not created.");
  }
  console.log("PASS: National Museum activity added successfully.");

  // Test Idempotency (re-approve)
  console.log("\nTesting idempotency of approval...");
  let resolveApproval2;
  const approvalPromise2 = new Promise(resolve => { resolveApproval2 = resolve; });

  const mockRes2 = {
    statusCode: 200,
    status: function (code) {
      this.statusCode = code;
      return this;
    },
    json: function (obj) {
      this.body = obj;
      resolveApproval2();
      return this;
    },
  };

  approveSuggestion(mockReq, mockRes2, nextSpy);
  await approvalPromise2;
  if (mockRes2.statusCode !== 200 || mockRes2.body.message !== "Suggestion was already approved and applied.") {
    throw new Error("FAIL: Duplicate approval request did not handle idempotency correctly.");
  }
  console.log("PASS: Duplicate approval request is idempotent and handles return gracefully.");

  // 4. Cleanup
  await User.deleteMany({ email: "test_integration@wanderwise.com" });
  await Trip.deleteMany({ destination: "Integration Test City" });
  await ChangeSuggestion.deleteMany({});
  await ChatMessage.deleteMany({});
  await mongoose.disconnect();
  console.log("\n-----------------------------------------");
  console.log("All Phase 5 Integration Tests PASSED!");
  console.log("-----------------------------------------");
}

runTests().catch(async (error) => {
  console.error("\nIntegration Test Failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
