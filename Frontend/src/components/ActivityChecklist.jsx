import React from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { updateActivityStatusLocal } from "../store/slices/itinerarySlice";
import { setActiveSuggestion } from "../store/slices/suggestionSlice";

// Helper to find the next scheduled activity in chronological order
const findNextActivity = (itinerary, currentActivityId) => {
  if (!itinerary || !itinerary.days) return null;
  
  const match = currentActivityId.match(/^day(\d+)-(.+)$/);
  if (!match) return null;
  
  const dayNum = parseInt(match[1], 10);
  const slotName = match[2].toLowerCase(); // "morning", "afternoon", or "evening"
  
  const day = itinerary.days.find((d) => d.day === dayNum);
  if (!day) return null;
  
  const slotsOrder = ["morning", "afternoon", "evening"];
  const currentIndex = slotsOrder.indexOf(slotName);
  if (currentIndex === -1) return null;
  
  // Check subsequent slots on same day
  for (let idx = currentIndex + 1; idx < slotsOrder.length; idx++) {
    const nextSlot = slotsOrder[idx];
    const capitalizedSlot = nextSlot.charAt(0).toUpperCase() + nextSlot.slice(1);
    const act = day.slots?.[capitalizedSlot];
    if (act) return act;
  }
  
  // Check subsequent days starting from morning
  const sortedDays = [...itinerary.days].sort((a, b) => a.day - b.day);
  const nextDays = sortedDays.filter((d) => d.day > dayNum);
  
  for (const nextDay of nextDays) {
    for (const nextSlot of slotsOrder) {
      const capitalizedSlot = nextSlot.charAt(0).toUpperCase() + nextSlot.slice(1);
      const act = nextDay.slots?.[capitalizedSlot];
      if (act) return act;
    }
  }
  
  return null;
};

/**
 * ActivityChecklist
 * Props:
 *   activityId    – unique slot key  (e.g., "day1-morning")
 *   dbId          – MongoDB ID of this activity
 *   initialStatus – MongoDB status ("Pending" or "Completed")
 *   label         – activity title text
 *   timing        – optional time string
 *   description   – optional short description
 *   disabled      – boolean
 */
export default function ActivityChecklist({ activityId, dbId, initialStatus, label, timing, description, disabled, onStatusChange }) {
  const dispatch = useDispatch();
  
  const itinerary = useSelector((state) => state.itinerary.itinerary);
  const activeTrip = useSelector((state) => state.trips.activeTrip);
  
  const isComplete = initialStatus === "Completed";

  const containerClasses = `w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-200 ${
    isComplete
      ? "bg-emerald-50 border-emerald-200"
      : "bg-white border-gray-200"
  } ${
    disabled 
      ? "" 
      : "group hover:border-indigo-300 hover:bg-indigo-50/40 cursor-pointer"
  }`;

  const handleClick = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log("ActivityChecklist clicked:", { activityId, dbId, isComplete, label });
    if (!disabled && dbId && activeTrip) {
      const nextStatus = isComplete ? "Pending" : "Completed";
      
      // Instant optimistic local update with 0 page refresh
      dispatch(updateActivityStatusLocal({ activityId: dbId, status: nextStatus }));

      try {
        console.log(`Sending PATCH request to set status to ${nextStatus}...`);
        const patchRes = await axios.patch(`/api/v1/activities/${dbId}/status`, { status: nextStatus });

        // Notify parent for live budget tracker refresh
        if (onStatusChange) {
          onStatusChange(patchRes.data?.activitySpent ?? null);
        }
        
        if (nextStatus === "Completed" && itinerary) {
          console.log("Finding next activity...");
          const nextAct = findNextActivity(itinerary, activityId);
          console.log("Next activity found:", nextAct);
          
          if (nextAct && nextAct.location) {
            const match = activityId.match(/^day(\d+)-/);
            const dayNum = match ? parseInt(match[1], 10) : 1;
            const dayData = itinerary.days?.find((d) => d.day === dayNum);
            
            let dateStr = activeTrip.startDate;
            if (dayData && dayData.date) {
              dateStr = new Date(dayData.date).toISOString().split("T")[0];
            } else if (activeTrip.startDate) {
              dateStr = new Date(activeTrip.startDate).toISOString().split("T")[0];
            }
            
            console.log(`Triggering weather check for: ${nextAct.activity} at ${nextAct.location} on ${dateStr}`);
            const response = await axios.post(
              `/api/v1/weather/check/${activeTrip._id}?location=${encodeURIComponent(nextAct.location)}&date=${dateStr}`
            );
            
            console.log("Weather check response:", response.data);
            
            if (response.data?.success && response.data?.alert && response.data?.suggestion) {
              console.log("Alert triggered! Setting active suggestion in Redux:", response.data.suggestion);
              dispatch(setActiveSuggestion(response.data.suggestion));
            } else {
              console.log("No alert triggered. response.data.alert:", response.data?.alert);
            }
          } else {
            console.log("No upcoming activity or location found.");
          }
        }
      } catch (err) {
        console.error("Activity completion toggle or weather check failed:", err.message);
      }
    }
  };

  const Component = disabled ? "div" : "button";

  return (
    <Component
      type={disabled ? undefined : "button"}
      id={`checklist-${activityId}`}
      onClick={handleClick}
      className={containerClasses}
    >
      {/* Checkbox circle */}
      <div
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
          isComplete
            ? "bg-emerald-500 border-emerald-500"
            : disabled 
            ? "border-gray-200" 
            : "border-gray-300 group-hover:border-indigo-400"
        }`}
      >
        {isComplete && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
          </svg>
        )}
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-semibold leading-tight transition-colors ${
            isComplete ? "text-emerald-700 line-through opacity-70" : "text-gray-900"
          }`}
        >
          {label}
        </p>
        {timing && (
          <p className="text-xs text-gray-500 mt-0.5 font-medium">{timing}</p>
        )}
        {description && (
          <p className={`text-xs mt-1 leading-relaxed ${isComplete ? "text-emerald-600/70" : "text-gray-500"}`}>
            {description}
          </p>
        )}
      </div>
    </Component>
  );
}
