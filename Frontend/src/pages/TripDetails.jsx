import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { fetchTripById, updateTripStatus, deleteTrip } from "../store/slices/tripSlice";
import { fetchItinerary, resolveActivityImage } from "../store/slices/itinerarySlice";
import { setActiveSuggestion } from "../store/slices/suggestionSlice";
import TripChatbot from "../components/TripChatbot";
import ActivityChecklist from "../components/ActivityChecklist";
import ChecklistModal from "../components/ChecklistModal";

// ─── Star Rating ──────────────────────────────────────────────────────────────
function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-3.5 h-3.5 ${star <= Math.round(rating) ? "text-amber-400" : "text-gray-200"}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="text-xs font-bold text-gray-600 ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

// ─── Hotel Card ───────────────────────────────────────────────────────────────
function HotelCard({ hotel }) {
  const cleanName = hotel.name.replace(/\(.*?\)/g, "").trim();
  const bookingUrl = `https://www.google.com/search?q=${encodeURIComponent(cleanName + " " + hotel.location + " hotel booking")}`;

  return (
    <div
      id={`hotel-${hotel._id}`}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm card-hover group flex flex-col justify-between"
    >
      <div>
        <div className="relative h-44 overflow-hidden">
          <img
            src={hotel.image}
            alt={hotel.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={(e) => {
              e.target.src = "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&auto=format&fit=crop";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1.5 shadow-md">
            <span className="text-sm font-extrabold text-gray-900">₹{hotel.pricePerNight}</span>
            <span className="text-xs text-gray-500">/night</span>
          </div>
        </div>

        <div className="p-5 pb-0">
          <h3
            className="font-bold text-gray-900 text-sm mb-1 line-clamp-1"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {hotel.name}
          </h3>
          <div className="flex items-center gap-1.5 mb-2">
            <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-xs text-gray-500 truncate">{hotel.location}</p>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">{hotel.description}</p>
          <StarRating rating={hotel.rating} />
        </div>
      </div>

      <div className="p-5 pt-4">
        <a
          href={bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          🏨 View & Book Deal
        </a>
      </div>
    </div>
  );
}


// ─── Activity Slot Card ───────────────────────────────────────────────────────
function ActivitySlotCard({ dayNum, slot, data, tripStatus, onStatusChange }) {
  const activityId = `day${dayNum}-${slot.toLowerCase()}`;

  const [loadedImage, setLoadedImage] = useState(null);

  const currentImage = loadedImage || data.image;

  useEffect(() => {
    let isMounted = true;
    const fetchLivePhoto = async () => {
      try {
        const response = await axios.get(`/api/v1/itineraries/search-image?query=${encodeURIComponent(data.activity)}`);
        if (response.data?.success && response.data?.imageUrl && isMounted) {
          setLoadedImage(response.data.imageUrl);
        }
      } catch (err) {
        console.error("Auto-fetch live photo failed:", err);
      }
    };
    
    fetchLivePhoto();

    return () => { isMounted = false; };
  }, [data.activity]);

  return (
    <div
      id={`activity-${activityId}`}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col justify-between"
    >
      <div>
        {/* Photo */}
        <div className="relative h-36 overflow-hidden group">
          <img
            src={currentImage}
            alt={data.activity}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              e.target.src = resolveActivityImage(data.activity, data.location);
            }}
          />
        </div>

        {/* Content */}
        <div className="p-5">
          <h4 className="font-bold text-gray-900 text-sm mb-2" style={{ fontFamily: "var(--font-display)" }}>
            {data.activity}
          </h4>
          <p className="text-xs text-gray-500 leading-relaxed mb-3">{data.description}</p>

          {/* AI Rationale Tag */}
          {data.rationale && (
            <div className="mb-3 bg-indigo-50/70 border border-indigo-100 rounded-xl p-2.5">
              <p className="text-[11px] font-medium text-indigo-800 leading-snug">
                💡 <span className="font-bold">Why AI picked this:</span> {data.rationale}
              </p>
            </div>
          )}

          {/* Travel Leg Pill */}
          {data.transportDetails && data.transportDetails.mode && data.transportDetails.mode !== "None" && (
            <div className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-slate-100/80 px-2.5 py-1 rounded-lg w-fit">
              <span>{data.transportDetails.mode === "Cab" ? "🚗" : "🚶"}</span>
              <span>{data.transportDetails.duration || "15 min"} {data.transportDetails.routeDistance ? `(${data.transportDetails.routeDistance})` : ""}</span>
            </div>
          )}

          {/* Timing chip & Cost tag */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-semibold text-indigo-600">{data.timing}</span>
            </div>
            {tripStatus === "Started" && data.cost > 0 && (
              <span className="text-xs font-extrabold text-gray-600 bg-gray-150 px-2.5 py-0.5 rounded-lg shadow-sm">
                ₹{data.cost}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-5 pt-0">
        {/* Checklist */}
        <ActivityChecklist
          activityId={activityId}
          dbId={data._id}
          initialStatus={data.status}
          label="Mark as visited"
          disabled={tripStatus !== "Started"}
          onStatusChange={onStatusChange}
        />
      </div>
    </div>
  );
}

const parseTimeString = (timeStr) => {
  if (!timeStr) return 99999;
  const match = String(timeStr).match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 99999;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours < 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

// ─── Day Block ────────────────────────────────────────────────────────────────
function DayBlock({ day, tripStatus, onStatusChange }) {
  const [expanded, setExpanded] = useState(true);
  const activities = day.activitiesList && day.activitiesList.length > 0 
    ? day.activitiesList 
    : ["Morning", "Afternoon", "Evening"].map((slot) => day.slots[slot]).filter(Boolean);

  const sortedActivities = useMemo(() => {
    return [...activities].sort((a, b) => {
      const timeA = parseTimeString(a.timing || a.time);
      const timeB = parseTimeString(b.timing || b.time);
      return timeA - timeB;
    });
  }, [activities]);

  return (
    <div id={`day-block-${day.day}`} className="mb-16 pb-12 border-b border-gray-100/70 last:border-b-0 last:mb-0 last:pb-0">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between w-full mb-7 group cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white font-extrabold text-sm shadow-md">
            {day.day}
          </div>
          <div className="text-left">
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-wide">Day {day.day}</p>
            <h3 className="font-bold text-gray-900 text-base" style={{ fontFamily: "var(--font-display)" }}>
              {day.title}
            </h3>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Slot grid */}
      {expanded && (
        <div className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {sortedActivities.map((actData, idx) => (
              <ActivitySlotCard
                key={actData._id || idx}
                dayNum={day.day}
                slot={actData.timeSlot || ["Morning", "Afternoon", "Evening"][idx % 3]}
                data={actData}
                tripStatus={tripStatus}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>

          {/* Daily Meal Suggestions */}
          {day.foodSuggestions && day.foodSuggestions.length > 0 && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-5 mt-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-base">🍽️</span>
                <h4 className="text-sm font-bold text-amber-900">Curated Meal Recommendations</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {day.foodSuggestions.map((meal, idx) => (
                  <div key={idx} className="bg-white rounded-xl border border-amber-200/60 p-4 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          {meal.mealType || "Meal"}
                        </span>
                        {meal.averagePrice > 0 && (
                          <span className="text-xs font-bold text-gray-600">~₹{meal.averagePrice}</span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-gray-900 line-clamp-1">{meal.restaurantName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{meal.cuisineType} · {meal.location || meal.nearPlace}</p>
                    </div>
                    {meal.rationale && (
                      <p className="text-[11px] text-amber-800/90 mt-2 bg-amber-50 p-2 rounded-lg leading-snug">
                        💡 {meal.rationale}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlannerCard({ title, body, accent }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent}`}>
      <p className="text-xs font-semibold uppercase tracking-wide mb-2">{title}</p>
      <p className="text-sm font-medium text-gray-700">{body}</p>
    </div>
  );
}

function PlannerTimeline({ schedule, budgetTarget, expensesSummary }) {
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const daysList = schedule && schedule.length > 0 ? schedule : [];
  const currentDaySchedule = daysList[selectedDayIdx] || daysList[0];
  const items = currentDaySchedule?.items || [];
  const totalSpent = expensesSummary?.total_spent || 0;
  const target = budgetTarget || 1;
  const isOverBudget = totalSpent > target;
  const budgetPercent = Math.round((totalSpent / Math.max(target, 1)) * 100);

  return (
    <div className="space-y-5">
      <div className={`rounded-3xl border p-5 transition-all ${
        isOverBudget ? "border-rose-200 bg-rose-50/60" : "border-indigo-100 bg-indigo-50/50"
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className={`text-sm font-semibold ${isOverBudget ? "text-rose-700" : "text-indigo-700"}`}>Trip budget</p>
            <p className={`text-xs ${isOverBudget ? "text-rose-600" : "text-indigo-600"}`}>
              {isOverBudget ? "⚠️ Target budget exceeded!" : "Live progress against your target"}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-sm font-bold ${isOverBudget ? "text-rose-600 font-extrabold" : "text-indigo-700"}`}>
              ₹{totalSpent} / ₹{budgetTarget || 0}
            </p>
            <p className={`text-xs ${isOverBudget ? "text-rose-500 font-bold" : "text-indigo-600"}`}>
              {budgetPercent}% used {isOverBudget ? "(Over budget!)" : ""}
            </p>
          </div>
        </div>
        <div className="h-3 rounded-full bg-white overflow-hidden shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isOverBudget
                ? "bg-gradient-to-r from-rose-500 to-red-600"
                : "bg-gradient-to-r from-indigo-500 to-cyan-500"
            }`}
            style={{ width: `${Math.min(100, budgetPercent)}%` }}
          />
        </div>
      </div>

      {/* Multi-Day Selector Tabs */}
      {daysList.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {daysList.map((dayData, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedDayIdx(idx)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedDayIdx === idx
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Day {dayData.day || idx + 1}
            </button>
          ))}
        </div>
      )}

      <div className="relative ml-3 border-l-2 border-indigo-100 pl-6 space-y-4">
        {items.map((item, index) => (
          <div key={`${item.type}-${index}`} className="relative">
            <div className="absolute -left-[1.5rem] top-2 h-4 w-4 rounded-full border-4 border-white bg-indigo-500" />
            {item.type === "transit" ? (
              <div className="rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-medium text-slate-700 inline-flex items-center gap-2 shadow-xs">
                {item.mode === "Cab" ? "🚗" : item.mode === "Walking" ? "🚶" : "🛣️"} {item.name}: {item.durationMinutes} min {item.distanceKm > 0 ? `· ${item.distanceKm} km` : ""} · {item.mode}
              </div>
            ) : item.type === "lunch" ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-amber-900">🍱 {item.name || "Lunch Break"}</p>
                    <p className="text-xs text-amber-700">{item.startTime} – {item.endTime}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                    🕒 {item.durationMinutes} min
                  </span>
                </div>
                {item.note && <p className="mt-1.5 text-xs text-amber-800/80">{item.note}</p>}
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.startTime} – {item.endTime} {item.location ? `· 📍 ${item.location}` : ""}</p>
                  </div>
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 whitespace-nowrap">
                    🕒 {item.durationMinutes} min
                  </span>
                </div>
                {item.note && <p className="mt-2 text-xs text-gray-600 leading-relaxed">{item.note}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const FEATURE_TAGS = ["🗺️ Full Itinerary", "🏨 Hotels", "🌅 Activities", "🤖 AI Companion", "✅ Checklist"];

export default function TripDetails() {
  const { tripId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const trip = useSelector((state) => state.trips.activeTrip);
  const trips = useSelector((state) => state.trips.trips);
  const { itinerary, loading } = useSelector((state) => state.itinerary);
  const [plannerSchedule, setPlannerSchedule] = useState(null);
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [routeSelectionLoading, setRouteSelectionLoading] = useState(false);
  const [expenseSummary, setExpenseSummary] = useState(null);
  const [checklistOpen, setChecklistOpen] = useState(false);

  const loadExpenseSummary = useCallback(async () => {
    if (!tripId) return;
    try {
      const res = await axios.get(`/api/v1/trips/${tripId}/expenses/summary`);
      setExpenseSummary(res.data?.data || null);
    } catch (err) {
      console.error("Failed to load expense summary", err);
    }
  }, [tripId]);

  const loadPlannerSchedule = useCallback(async () => {
    if (!tripId) return;
    setPlannerLoading(true);
    try {
      const res = await axios.get(`/api/v1/trips/${tripId}/schedule`);
      setPlannerSchedule(res.data?.data?.schedule || null);
    } catch (err) {
      console.error("Failed to load planner schedule", err);
    } finally {
      setPlannerLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    dispatch(fetchTripById(tripId));
    dispatch(fetchItinerary(tripId));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [tripId, dispatch]);

  useEffect(() => {
    loadExpenseSummary();
    if (trip?.status === "Started" || trip?.status === "Completed" || trip?.status === "Planned") {
      loadPlannerSchedule();
    }
  }, [loadExpenseSummary, loadPlannerSchedule, trip?.status]);

  const handleUpdateStatus = async (newStatus) => {
    if (newStatus === "Started") {
      const hasActive = trips.some((t) => t.status === "Started" && t._id !== tripId);
      if (hasActive) {
        alert("You already have an active live trip. Please complete it first before starting another one!");
        return;
      }
      setPlannerLoading(true);
      try {
        const res = await axios.post(`/api/v1/trips/${tripId}/start`);
        setPlannerSchedule(res.data?.data?.schedule || null);
        dispatch(fetchTripById(tripId));
      } catch (err) {
        console.error("Failed to start trip", err);
        alert("Could not start the trip right now.");
      } finally {
        setPlannerLoading(false);
      }
    }
    if (newStatus !== "Started") {
      dispatch(updateTripStatus({ tripId, status: newStatus }));
    }
  };

  const handleDeleteTrip = async () => {
    if (window.confirm("Are you sure you want to delete this trip and all its itinerary data?")) {
      const result = await dispatch(deleteTrip(tripId));
      if (deleteTrip.fulfilled.match(result)) {
        navigate("/dashboard");
      }
    }
  };

  const handleRouteSelection = async (optionId) => {
    setRouteSelectionLoading(true);
    try {
      await axios.patch(`/api/v1/trips/${tripId}/route-option`, { optionId });
      await Promise.all([dispatch(fetchTripById(tripId)), dispatch(fetchItinerary(tripId))]);
    } catch (err) {
      console.error("Failed to select route option", err);
      alert(err.response?.data?.message || "Could not apply this route option.");
    } finally {
      setRouteSelectionLoading(false);
    }
  };

  const destinationData = itinerary || {};
  const budgetTarget = trip?.budgetTarget || trip?.budget || trip?.totalBudget || 0;
  const plannerSummary = useMemo(() => {
    const totalSpent = expenseSummary?.total_spent || 0;
    const remaining = expenseSummary?.remaining_budget !== undefined
      ? expenseSummary.remaining_budget
      : (budgetTarget - totalSpent);
    return {
      totalSpent,
      plannedBudget: expenseSummary?.planned_budget || budgetTarget,
      remainingBudget: remaining,
      isOverBudget: remaining < 0,
    };
  }, [expenseSummary, budgetTarget]);
  const heroImage =
    trip?.coverImage ||
    "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&auto=format&fit=crop";

  const handleScrollToSection = (tag) => {
    let targetId = "";
    if (tag.includes("Hotels")) targetId = "hotel-recommendations";
    if (tag.includes("Activities")) targetId = "places-to-visit";
    if (tag.includes("Full Itinerary")) targetId = "trip-hero";
    if (tag.includes("AI Companion")) {
      // ID matches the actual button in TripChatbot.jsx
      const chatBtn = document.getElementById("chatbot-toggle");
      if (chatBtn) chatBtn.click();
      return;
    }
    if (tag.includes("Checklist")) {
      setChecklistOpen(true);
      return;
    }

    if (targetId) {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  return (
    <div className="flex-1 pb-20">
      {/* ── Hero Header ────────────────────────────────────────────────────── */}
      <div id="trip-hero" className="relative h-72 sm:h-96 overflow-hidden">
        <img
          src={heroImage}
          alt={trip?.destination || "Trip destination"}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&auto=format&fit=crop";
          }}
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        {/* Back button */}
        <Link
          to="/dashboard"
          id="back-to-dashboard"
          className="absolute top-4 left-4 flex items-center gap-1.5 text-white/90 hover:text-white font-semibold text-sm bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-xl transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          My Trips
        </Link>

        {/* Destination info */}
        <div className="absolute bottom-6 left-0 right-0 px-6 sm:px-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1
              className="text-white text-3xl sm:text-4xl font-extrabold drop-shadow-lg mb-1"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {trip?.destination || destinationData.destination || "Your Destination"}
            </h1>
            <p className="text-white/80 text-sm font-medium">
              {trip?.duration || destinationData.duration} days · {trip?.budget} · {trip?.companions}
            </p>
          </div>

          {/* Action buttons based on status */}
          {trip?.status === "Planned" && (
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <button
                onClick={() => handleUpdateStatus("Started")}
                disabled={plannerLoading}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-md transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {plannerLoading ? "⏳ Starting…" : "🚀 Start Trip"}
              </button>
              <button
                onClick={handleDeleteTrip}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm shadow-md transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                🗑️ Delete Trip
              </button>
            </div>
          )}

          {trip?.status === "Started" && (
            <button
              onClick={() => handleUpdateStatus("Completed")}
              className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer self-start sm:self-auto"
            >
              🏁 Complete Trip
            </button>
          )}

          {trip?.status === "Completed" && (
            <span className="px-4 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl font-bold text-xs self-start sm:self-auto uppercase tracking-wide">
              Completed Trip ✅
            </span>
          )}
        </div>
      </div>

      {/* ── Feature Tag Strip ───────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-10 py-3 overflow-x-auto">
        <div className="flex items-center gap-4 min-w-max" id="feature-tags">
          {FEATURE_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => handleScrollToSection(tag)}
              className="text-xs font-semibold px-4.5 py-2.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-150 whitespace-nowrap transition-all duration-200 cursor-pointer hover:scale-[1.03] active:scale-[0.97]"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pt-10">

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <svg className="animate-spin w-10 h-10 text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4}/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <p className="text-gray-400 text-sm font-medium">Building your itinerary…</p>
          </div>
        ) : trip?.status === "Planned" ? (
          <div className="bg-white rounded-3xl border border-gray-150 shadow-sm max-w-5xl mx-auto mb-10 p-8 sm:p-10">
            <div className="mb-8 pb-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-2">Dynamic trip planner</h2>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Your upcoming trip is in a bucket-list view. Start it to unlock the optimized timeline.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3 mb-8">
              <PlannerCard title="Best time" body="We’ll suggest ideal visit windows before sequencing your day." accent="bg-amber-50 border-amber-100" />
              <PlannerCard title="Duration" body="Each stop will keep its estimated visit length and pacing." accent="bg-cyan-50 border-cyan-100" />
              <PlannerCard title="Opening hours" body="We’ll keep the plan within the available windows and lunch breaks." accent="bg-indigo-50 border-indigo-100" />
            </div>

            {trip?.routeAlternatives?.length > 0 && (
              <div className="mb-8">
                <h3 className="font-bold text-gray-800">Choose your hotel starting point</h3>
                <p className="text-xs text-gray-500 mt-1 mb-4">Each route visits the same attractions using nearest-neighbour + 2-opt ordering. Select the hotel whose round-trip estimate works best for you.</p>
                <div className="grid gap-3 md:grid-cols-3">
                  {trip.routeAlternatives.map((option) => {
                    const selected = trip.selectedRouteAlternative === option.id;
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleRouteSelection(option.id)}
                        disabled={routeSelectionLoading || selected}
                        className={`rounded-2xl border p-4 text-left transition ${selected ? "border-indigo-500 bg-indigo-50" : "border-gray-200 bg-white hover:border-indigo-300"}`}
                      >
                        <p className="font-bold text-sm text-gray-900">{option.hotel?.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{option.hotel?.address || option.hotel?.distanceFromRoute || "City centre"}</p>
                        <p className="text-sm font-extrabold text-indigo-600 mt-3">~{option.estimatedDistanceKm} km</p>
                        <p className="text-xs text-gray-500">estimated round trip</p>
                        <p className="text-xs font-semibold mt-3 text-indigo-700">{selected ? "Selected" : "Use this route"}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-dashed border-indigo-200 bg-indigo-50/40 p-6 text-center">
              <p className="text-sm font-semibold text-indigo-700">Ready to start your optimized day?</p>
              <button
                onClick={() => handleUpdateStatus("Started")}
                disabled={plannerLoading}
                className="mt-4 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-70"
              >
                {plannerLoading ? "⏳ Preparing timeline…" : "Start Trip"}
              </button>
            </div>
          </div>
        ) : (
          /* Full detailed/interactive view for Live and Completed Trips */
          <>
            {trip?.status === "Completed" && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 mb-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-xl font-bold">
                    🎉
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-emerald-900">Congratulations! You completed this trip.</h2>
                    <p className="text-xs text-emerald-600 mt-0.5">Here is your travel summary and itinerary log</p>
                  </div>
                </div>
                <div className="flex gap-6 items-center flex-wrap">
                  <div className="text-center">
                    <p className="text-xs text-emerald-600/80 font-medium">Spots Explored</p>
                    <p className="text-lg font-extrabold text-emerald-900">100%</p>
                  </div>
                  <div className="h-8 w-px bg-emerald-200" />
                  <div className="text-center">
                    <p className="text-xs text-emerald-600/80 font-medium">Stay Type</p>
                    <p className="text-lg font-extrabold text-emerald-900">{trip?.budget}</p>
                  </div>
                  <div className="h-8 w-px bg-emerald-200" />
                  <div className="text-center">
                    <p className="text-xs text-emerald-600/80 font-medium">Travelers</p>
                    <p className="text-lg font-extrabold text-emerald-900">{trip?.travelers} Pax</p>
                  </div>
                </div>
              </div>
            )}

            {(plannerSchedule || trip?.status === "Started" || trip?.status === "Completed" || trip?.status === "Planned") && (
              <section className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-extrabold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>Optimized day plan</h2>
                    <p className="text-gray-500 text-xs mt-0.5">A proximity-first timeline with transit caps and a lunch break.</p>
                  </div>
                  <div className={`rounded-2xl px-3.5 py-2 text-sm font-bold border transition-all ${
                    plannerSummary.isOverBudget
                      ? "bg-rose-50 border-rose-200 text-rose-600 shadow-sm"
                      : "bg-gray-50 border-gray-100 text-gray-700"
                  }`}>
                    Budget left: <span className={plannerSummary.isOverBudget ? "text-rose-600 font-extrabold" : ""}>₹{plannerSummary.remainingBudget}</span>
                  </div>
                </div>
                {plannerLoading ? (
                  <div className="rounded-3xl border border-indigo-100 bg-indigo-50/30 p-8 text-center text-sm font-semibold text-indigo-600 animate-pulse flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    Generating live optimized timeline schedule...
                  </div>
                ) : plannerSchedule ? (
                  <PlannerTimeline schedule={plannerSchedule} budgetTarget={budgetTarget} expensesSummary={expenseSummary} />
                ) : (
                  <div className="rounded-3xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
                    Start the trip to generate the live timeline view.
                  </div>
                )}
              </section>
            )}

            {trip?.status === "Completed" && expenseSummary && (
              <section className="mb-10 rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-teal-50/60 p-6 shadow-sm">
                {/* Header */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-lg">💰</div>
                  <div>
                    <h2 className="text-xl font-extrabold text-emerald-900">Post-Trip Expense Breakdown</h2>
                    <p className="text-xs text-emerald-700 mt-0.5">Complete spending analysis for your trip</p>
                  </div>
                </div>

                {/* Summary row */}
                <div className="grid gap-3 grid-cols-2 md:grid-cols-4 mb-6">
                  {(() => {
                    const remainingVal = expenseSummary.remaining_budget ?? 0;
                    const isOver = remainingVal < 0;
                    return [
                      { label: "Total Spent", value: `₹${expenseSummary.total_spent || 0}`, color: "text-rose-600", bg: "bg-rose-50 border-rose-100" },
                      { label: "Budget", value: `₹${expenseSummary.planned_budget || 0}`, color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-100" },
                      { label: "Remaining", value: `₹${remainingVal}`, color: isOver ? "text-rose-600 font-extrabold" : "text-emerald-600 font-extrabold", bg: isOver ? "bg-rose-50 border-rose-200" : "bg-emerald-50 border-emerald-100" },
                      { label: "Budget Used", value: `${expenseSummary.budget_percent || 0}%`, color: isOver ? "text-rose-600 font-extrabold" : "text-amber-600", bg: isOver ? "bg-rose-50 border-rose-100" : "bg-amber-50 border-amber-100" },
                    ].map((item) => (
                      <div key={item.label} className={`rounded-2xl border p-4 ${item.bg}`}>
                        <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-1">{item.label}</p>
                        <p className={`text-xl font-extrabold ${item.color}`}>{item.value}</p>
                      </div>
                    ));
                  })()}
                </div>

                {/* Overall progress bar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-gray-600">Budget utilisation</span>
                    <span className="text-xs font-bold text-indigo-600">{expenseSummary.budget_percent || 0}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-white overflow-hidden shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        (expenseSummary.budget_percent || 0) > 100
                          ? "bg-gradient-to-r from-rose-500 to-red-600"
                          : (expenseSummary.budget_percent || 0) > 80
                          ? "bg-gradient-to-r from-amber-400 to-orange-500"
                          : "bg-gradient-to-r from-emerald-400 to-teal-500"
                      }`}
                      style={{ width: `${Math.min(100, expenseSummary.budget_percent || 0)}%` }}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  {/* By-Category table */}
                  {expenseSummary.by_category && Object.keys(expenseSummary.by_category).length > 0 && (
                    <div className="bg-white rounded-2xl border border-emerald-100 overflow-hidden shadow-sm">
                      <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
                        <span className="text-sm">📊</span>
                        <h3 className="text-sm font-bold text-gray-800">Breakdown by Category</h3>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {Object.entries(expenseSummary.by_category)
                          .sort(([, a], [, b]) => b - a)
                          .map(([cat, amt]) => {
                            const pct = expenseSummary.total_spent > 0
                              ? Math.round((amt / expenseSummary.total_spent) * 100)
                              : 0;
                            return (
                              <div key={cat} className="px-4 py-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-semibold text-gray-700">{cat}</span>
                                  <span className="text-xs font-extrabold text-gray-900">₹{amt.toFixed(0)} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                                </div>
                                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-teal-400" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* By-Day table */}
                  {expenseSummary.by_day && Object.keys(expenseSummary.by_day).length > 0 && (
                    <div className="bg-white rounded-2xl border border-emerald-100 overflow-hidden shadow-sm">
                      <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
                        <span className="text-sm">📅</span>
                        <h3 className="text-sm font-bold text-gray-800">Breakdown by Day</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-4 py-2.5 text-left font-bold text-gray-600">Date</th>
                              <th className="px-4 py-2.5 text-right font-bold text-gray-600">Spent</th>
                              <th className="px-4 py-2.5 text-right font-bold text-gray-600">Share</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {Object.entries(expenseSummary.by_day)
                              .sort(([a], [b]) => a.localeCompare(b))
                              .map(([date, amt]) => {
                                const pct = expenseSummary.total_spent > 0
                                  ? Math.round((amt / expenseSummary.total_spent) * 100)
                                  : 0;
                                return (
                                  <tr key={date} className="hover:bg-gray-50/60 transition-colors">
                                    <td className="px-4 py-2.5 font-medium text-gray-700">{date}</td>
                                    <td className="px-4 py-2.5 text-right font-extrabold text-gray-900">₹{Number(amt).toFixed(0)}</td>
                                    <td className="px-4 py-2.5 text-right text-gray-500">{pct}%</td>
                                  </tr>
                                );
                              })}
                          </tbody>
                          <tfoot>
                            <tr className="bg-emerald-50">
                              <td className="px-4 py-2.5 font-bold text-emerald-800">Total</td>
                              <td className="px-4 py-2.5 text-right font-extrabold text-emerald-800">₹{expenseSummary.total_spent}</td>
                              <td className="px-4 py-2.5 text-right font-bold text-emerald-700">100%</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tip */}
                <div className="mt-4 flex items-start gap-2.5 bg-white/70 border border-emerald-100 rounded-xl p-3">
                  <span className="text-base flex-shrink-0">💡</span>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    <span className="font-bold">Tip:</span> During your trip you can tell the AI Companion things like{" "}
                    <span className="font-semibold italic">"add ₹200 for food today"</span> or{" "}
                    <span className="font-semibold italic">"log ₹500 for cab yesterday"</span> to automatically update your budget tracker.
                  </p>
                </div>
              </section>
            )}

            {/* ── Hotel Recommendations ─────────────────────────────────────── */}
            {destinationData.hotels && destinationData.hotels.length > 0 && (
              <section id="hotel-recommendations" className="mb-14">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h2
                      className="text-2xl font-extrabold text-gray-900"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Hotel Recommendations
                    </h2>
                    <p className="text-gray-500 text-xs mt-0.5">Curated stays matching your budget tier</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="hotel-grid">
                  {destinationData.hotels.map((hotel) => (
                    <HotelCard key={hotel._id} hotel={hotel} />
                  ))}
                </div>
              </section>
            )}

            {/* Section Spacer */}
            {destinationData.hotels && destinationData.hotels.length > 0 && (
              <div className="h-16 sm:h-24 border-t border-gray-100/60 my-6"></div>
            )}

            {/* ── Places to Visit ───────────────────────────────────────────── */}
            <section id="places-to-visit" className="mb-14">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <div>
                  <h2
                    className="text-2xl font-extrabold text-gray-900"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Places to Visit
                  </h2>
                  <p className="text-gray-500 text-xs mt-0.5">Day-by-day activity schedule</p>
                </div>
              </div>

              {/* Day blocks */}
              <div id="day-blocks" className="mt-8">
                {(destinationData.days || []).map((day) => (
                  <DayBlock key={day.day} day={day} tripStatus={trip?.status} onStatusChange={loadExpenseSummary} />
                ))}
              </div>
            </section>
          </>
        )}
      </div>

      {/* ── Checklist Modal ───────────────────────────────────────────────────── */}
      <ChecklistModal
        open={checklistOpen}
        onClose={() => setChecklistOpen(false)}
        onActivityToggled={loadExpenseSummary}
      />

      {/* ── AI Companion Chatbot ─────────────────────────────────────────────── */}
      <TripChatbot tripId={tripId} />
    </div>
  );
}
