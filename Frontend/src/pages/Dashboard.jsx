import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation } from "react-router-dom";
import { fetchTrips, deleteTrip } from "../store/slices/tripSlice";

// ─── Budget badge colours ─────────────────────────────────────────────────────
const BUDGET_STYLES = {
  Cheap:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  Moderate: "bg-amber-50 text-amber-700 border-amber-200",
  Luxury:   "bg-purple-50 text-purple-700 border-purple-200",
};

const COMPANION_ICONS = {
  "Just Me":  "🧍",
  "A Couple": "👫",
  Family:     "👨‍👩‍👧‍👦",
  Friends:    "🎉",
};

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm animate-pulse">
      <div className="h-44 bg-gray-200" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-gray-200 rounded-lg w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="flex gap-2 mt-3">
          <div className="h-6 w-20 bg-gray-100 rounded-full" />
          <div className="h-6 w-16 bg-gray-100 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ─── Trip Card ────────────────────────────────────────────────────────────────
function TripCard({ trip }) {
  const dispatch = useDispatch();
  const budgetStyle = BUDGET_STYLES[trip.budget] || "bg-gray-50 text-gray-600 border-gray-200";
  const companionIcon = COMPANION_ICONS[trip.companions] || "🧳";

  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this trip and all its itinerary data?")) {
      dispatch(deleteTrip(trip._id));
    }
  };

  return (
    <div
      id={`trip-card-${trip._id}`}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm card-hover group"
    >
      {/* Cover image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={trip.coverImage}
          alt={trip.destination}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => {
            e.target.src =
              "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&auto=format&fit=crop";
          }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        {/* Duration badge */}
        <span className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full">
          {trip.duration} days
        </span>
        {/* Companion icon */}
        <span className="absolute bottom-3 left-3 text-2xl drop-shadow-sm">
          {companionIcon}
        </span>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3
          className="text-base font-bold text-gray-900 truncate mb-1"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {trip.destination}
        </h3>
        <p className="text-xs text-gray-400 mb-3">
          {trip.companions} · {new Date(trip.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>

        {/* Tags */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${budgetStyle}`}>
            {trip.budget}
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-600">
            {trip.duration}d
          </span>
        </div>

        <div className="flex gap-2">
          <Link
            to={`/trip/${trip._id}`}
            id={`view-trip-${trip._id}`}
            className="flex-1 text-center py-2.5 rounded-xl text-xs font-bold text-indigo-600 border-2 border-indigo-100 bg-indigo-50 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all duration-200"
          >
            View Itinerary →
          </Link>
          {(trip.status === "Planned" || trip.status === "Draft") && (
            <button
              onClick={handleDelete}
              id={`delete-trip-${trip._id}`}
              className="px-3 rounded-xl border border-red-250 text-red-500 bg-red-50 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-200 flex items-center justify-center cursor-pointer"
              title="Delete Trip"
            >
              🗑️
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const dispatch = useDispatch();
  const location = useLocation();
  const { trips, loading } = useSelector((state) => state.trips);

  useEffect(() => {
    dispatch(fetchTrips());
  }, [dispatch]);

  useEffect(() => {
    if (location.hash === "#completed") {
      setTimeout(() => {
        const element = document.getElementById("completed-trips-section");
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 300);
    }
  }, [location, trips]);

  // Filter trips by status
  const liveTrip = trips.find((t) => t.status === "Started");
  const upcomingTrips = trips.filter((t) => t.status === "Planned" || t.status === "Draft");
  const completedTrips = trips.filter((t) => t.status === "Completed");

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1
            className="text-3xl sm:text-4xl font-extrabold text-gray-900"
            style={{ fontFamily: "var(--font-display)" }}
          >
            My Trips
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {loading ? "Loading…" : `${trips.length} trip${trips.length !== 1 ? "s" : ""} active or planned`}
          </p>
        </div>

        <Link
          id="new-trip-btn"
          to="/create-trip"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm gradient-brand shadow-md hover:opacity-90 hover:scale-105 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Plan New Trip
        </Link>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" id="trip-grid-skeleton">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : trips.length > 0 ? (
        <div className="space-y-12">
          {/* 1. Live Active Session */}
          {liveTrip && (
            <div id="live-trip-section" className="mb-10">
              <h2 className="text-lg font-extrabold text-gray-900 mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                Active Live Trip
              </h2>
              <div className="bg-indigo-900 text-white rounded-2xl overflow-hidden shadow-md flex flex-col md:flex-row relative">
                {/* Side Image */}
                <div className="w-full md:w-1/3 h-48 md:h-auto relative overflow-hidden">
                  <img
                    src={liveTrip.coverImage}
                    alt={liveTrip.destination}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&auto=format&fit=crop";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r md:bg-gradient-to-l from-indigo-900/40 via-transparent to-transparent" />
                </div>
                {/* Details */}
                <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md">
                      Currently On-Going 🚀
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-extrabold mt-3" style={{ fontFamily: "var(--font-display)" }}>
                      {liveTrip.destination}
                    </h3>
                    <p className="text-indigo-200 text-xs sm:text-sm mt-1 font-semibold">
                      {liveTrip.companions} · {liveTrip.duration} days adventure
                    </p>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-4 items-center">
                    <Link
                      to={`/trip/${liveTrip._id}`}
                      id={`view-live-${liveTrip._id}`}
                      className="px-5 py-2.5 rounded-xl bg-white text-indigo-900 font-bold text-xs hover:bg-indigo-50 hover:scale-105 transition-all shadow-md"
                    >
                      Open Live Itinerary →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. Upcoming Adventures */}
          {upcomingTrips.length > 0 && (
            <div id="upcoming-trips-section">
              <h2 className="text-lg font-extrabold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>
                Upcoming Adventures ({upcomingTrips.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {upcomingTrips.map((trip) => (
                  <TripCard key={trip._id} trip={trip} />
                ))}
              </div>
            </div>
          )}

          {/* 3. Completed Journeys */}
          {completedTrips.length > 0 && (
            <div id="completed-trips-section" className="opacity-75">
              <h2 className="text-lg font-extrabold text-gray-400 mb-4" style={{ fontFamily: "var(--font-display)" }}>
                Past Journeys ({completedTrips.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {completedTrips.map((trip) => (
                  <TripCard key={trip._id} trip={trip} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-2xl gradient-brand flex items-center justify-center mb-6 animate-float">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2" style={{ fontFamily: "var(--font-display)" }}>
            No trips yet
          </h2>
          <p className="text-gray-400 text-sm mb-6 max-w-sm">
            Start planning your first adventure and WanderWise AI will build a personalised itinerary for you.
          </p>
          <Link
            to="/create-trip"
            id="empty-state-cta"
            className="px-6 py-3 rounded-xl text-white font-bold text-sm gradient-brand shadow-md hover:opacity-90 transition-all"
          >
            Plan Your First Trip
          </Link>
        </div>
      )}
    </div>
  );
}
