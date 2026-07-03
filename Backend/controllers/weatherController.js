import { Trip } from "../models/Trip.js";
import { ChangeSuggestion } from "../models/ChangeSuggestion.js";
import { aiService } from "../services/aiService.js";
import { notificationService } from "../services/notificationService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// @desc    Perform dynamic weather checks and trigger detour suggestions if needed
// @route   POST /api/v1/weather/check/:tripId
// @access  Private
export const checkWeatherAndReplan = asyncHandler(async (req, res, next) => {
  const { tripId } = req.params;

  const trip = await Trip.findById(tripId);
  if (!trip) {
    res.status(404);
    throw new Error("Trip not found.");
  }

  // Ensure user owns this trip record
  if (trip.user.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error("Not authorized to access this trip weather check.");
  }

  const { location, date } = req.query;

  // 1. Invoke the check_weather MCP tool on the AI microservice
  let mcpResponse;
  try {
    mcpResponse = await aiService.callMCPTool("check_weather", {
      location: location || trip.destination,
      date: date || trip.startDate.toISOString().split("T")[0]
    });
  } catch (error) {
    console.error("AI Weather Tool failed:", error.message);
    res.status(503);
    throw new Error(`Weather check unavailable: ${error.message}`);
  }

  if (!mcpResponse || !mcpResponse.success) {
    res.status(502);
    throw new Error("Failed to retrieve weather data from AI service.");
  }

  const weatherData = mcpResponse.result;
  const conditionLower = (weatherData.condition || "").toLowerCase();
  const isRainyCondition = ["rainy", "thunderstorm", "drizzle", "snowy", "cloudy", "sunny"].includes(conditionLower);
  const isAbnormal = weatherData.has_abnormal_alert || weatherData.precipitation_pct > 10 || isRainyCondition;

  if (isAbnormal) {
    // 2. Check if a Pending weather suggestion already exists for this trip
    const existingSuggestion = await ChangeSuggestion.findOne({
      trip: tripId,
      triggerType: "Weather",
      status: "Pending",
      expiresAt: { $gt: new Date() }
    });

    if (existingSuggestion) {
      return res.status(200).json({
        success: true,
        alert: true,
        weather: weatherData,
        suggestion: existingSuggestion
      });
    }

    // 3. Call replan workflow in AI service to get the detour proposal
    let alertReason = "";
    if (weatherData.has_abnormal_alert) {
      alertReason = weatherData.anomaly_reasoning || `Abnormal temperature detected: ${weatherData.temperature_celsius}°C (vs historical baseline).`;
    } else {
      const cond = weatherData.condition || "Rainy";
      alertReason = `Severe weather expected: ${cond} with ${weatherData.precipitation_pct}% chance of precipitation.`;
    }
    
    let replanData;
    try {
      replanData = await aiService.replanTrip(trip, "Weather", alertReason, weatherData);
    } catch (error) {
      console.error("AI Replan Workflow failed:", error.message);
      res.status(503);
      throw new Error(`Weather replan generation failed: ${error.message}`);
    }

    // 4. Persist the ChangeSuggestion in MongoDB
    const suggestion = await ChangeSuggestion.create({
      trip: trip._id,
      triggerType: "Weather",
      reason: alertReason,
      generatedSummary: replanData.generatedSummary,
      estimatedBudgetImpact: replanData.estimatedBudgetImpact || 0,
      estimatedTimeImpact: replanData.estimatedTimeImpact || 0,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expirable after 24 hrs
      beforeSnapshot: replanData.beforeSnapshot || { activities: [] },
      afterSnapshot: replanData.afterSnapshot || { activities: [] },
      suggestedChanges: replanData.suggestedChanges || { activities: [] }
    });

    // 5. Create a push/in-app notification for the weather alert
    await notificationService.createNotification(
      trip.user,
      trip._id,
      weatherData.has_abnormal_alert ? "Weather Alert: Extreme Temperature" : "Weather Alert: Rain Expected",
      replanData.generatedSummary,
      "WeatherAlert",
      suggestion._id
    );

    return res.status(200).json({
      success: true,
      alert: true,
      weather: weatherData,
      suggestion
    });
  }

  // If no abnormal weather alert is warranted, return normal status
  return res.status(200).json({
    success: true,
    alert: false,
    weather: weatherData
  });
});
