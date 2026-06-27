import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchTripById } from "../store/slices/tripSlice";
import { fetchItinerary } from "../store/slices/itinerarySlice";
import TripChatbot from "../components/TripChatbot";
import ActivityChecklist from "../components/ActivityChecklist";

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
  return (
    <div
      id={`hotel-${hotel._id}`}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm card-hover group"
    >
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
        {/* Price badge */}
        <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1.5 shadow-md">
          <span className="text-sm font-extrabold text-gray-900">${hotel.pricePerNight}</span>
          <span className="text-xs text-gray-500">/night</span>
        </div>
      </div>

      <div className="p-4">
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
  );
}

// ─── Time-of-Day Icon ─────────────────────────────────────────────────────────
const SLOT_META = {
  Morning:   { icon: "🌅", color: "bg-amber-50 border-amber-200 text-amber-700" },
  Afternoon: { icon: "☀️", color: "bg-orange-50 border-orange-200 text-orange-700" },
  Evening:   { icon: "🌙", color: "bg-indigo-50 border-indigo-200 text-indigo-700" },
};

// ─── Activity Slot Card ───────────────────────────────────────────────────────
function ActivitySlotCard({ dayNum, slot, data }) {
  const meta = SLOT_META[slot] || { icon: "📍", color: "bg-gray-50 border-gray-200 text-gray-700" };
  const activityId = `day${dayNum}-${slot.toLowerCase()}`;

  return (
    <div
      id={`activity-${activityId}`}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm"
    >
      {/* Photo */}
      <div className="relative h-36 overflow-hidden">
        <img
          src={data.image}
          alt={data.activity}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            e.target.src = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&auto=format&fit=crop";
          }}
        />
        {/* Slot badge */}
        <div className="absolute top-2 left-2">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${meta.color}`}>
            {meta.icon} {slot}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h4 className="font-bold text-gray-900 text-sm mb-1" style={{ fontFamily: "var(--font-display)" }}>
          {data.activity}
        </h4>
        <p className="text-xs text-gray-500 leading-relaxed mb-3">{data.description}</p>

        {/* Timing chip */}
        <div className="flex items-center gap-1.5 mb-3">
          <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs font-semibold text-indigo-600">{data.timing}</span>
        </div>

        {/* Checklist */}
        <ActivityChecklist
          activityId={activityId}
          label="Mark as visited"
          timing={data.timing}
        />
      </div>
    </div>
  );
}

// ─── Day Block ────────────────────────────────────────────────────────────────
function DayBlock({ day }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div id={`day-block-${day.day}`} className="mb-8">
      {/* Day header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between w-full mb-4 group"
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
          {["Morning", "Afternoon", "Evening"].map(
            (slot) =>
              day.slots[slot] && (
                <ActivitySlotCard key={slot} dayNum={day.day} slot={slot} data={day.slots[slot]} />
              )
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const FEATURE_TAGS = ["🗺️ Full Itinerary", "🏨 Hotels", "🌅 Activities", "🤖 AI Companion", "✅ Checklist"];

export default function TripDetails() {
  const { tripId } = useParams();
  const dispatch = useDispatch();

  const trip = useSelector((state) => state.trips.activeTrip);
  const { itinerary, loading } = useSelector((state) => state.itinerary);

  useEffect(() => {
    dispatch(fetchTripById(tripId));
    dispatch(fetchItinerary(tripId));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [tripId, dispatch]);

  const destinationData = itinerary || {};
  const heroImage =
    trip?.coverImage ||
    "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&auto=format&fit=crop";

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
        <div className="absolute bottom-6 left-0 right-0 px-6 sm:px-10">
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
      </div>

      {/* ── Feature Tag Strip ───────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-10 py-3 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max" id="feature-tags">
          {FEATURE_TAGS.map((tag) => (
            <span
              key={tag}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 whitespace-nowrap"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pt-10">

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <svg className="animate-spin w-10 h-10 text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <p className="text-gray-400 text-sm font-medium">Building your itinerary…</p>
          </div>
        ) : (
          <>
            {/* ── Hotel Recommendations ─────────────────────────────────────── */}
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
                {(destinationData.hotels || []).map((hotel) => (
                  <HotelCard key={hotel._id} hotel={hotel} />
                ))}
              </div>
            </section>

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
              <div id="day-blocks">
                {(destinationData.days || []).map((day) => (
                  <DayBlock key={day.day} day={day} />
                ))}
              </div>
            </section>
          </>
        )}
      </div>

      {/* ── AI Companion Chatbot ─────────────────────────────────────────────── */}
      <TripChatbot tripId={tripId} />
    </div>
  );
}
