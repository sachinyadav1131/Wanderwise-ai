import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchTripById, updateTripStatus, deleteTrip } from "../store/slices/tripSlice";
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
function ActivitySlotCard({ dayNum, slot, data, tripStatus }) {
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
      <div className="p-5.5">
        <h4 className="font-bold text-gray-900 text-sm mb-6" style={{ fontFamily: "var(--font-display)" }}>
          {data.activity}
        </h4>
        <p className="text-xs text-gray-500 leading-relaxed mb-6">{data.description}</p>

        {/* Timing chip & Cost tag */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-semibold text-indigo-600">{data.timing}</span>
          </div>
          {tripStatus === "Started" && data.cost > 0 && (
            <span className="text-xs font-extrabold text-gray-600 bg-gray-100 border border-gray-200 px-2.5 py-0.5 rounded-lg shadow-sm">
              ₹{data.cost}
            </span>
          )}
        </div>

        {/* Checklist */}
        <ActivityChecklist
          activityId={activityId}
          label="Mark as visited"
          disabled={tripStatus !== "Started"}
        />
      </div>
    </div>
  );
}

// ─── Day Block ────────────────────────────────────────────────────────────────
function DayBlock({ day, tripStatus }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div id={`day-block-${day.day}`} className="mb-24 pb-12 border-b border-gray-100/70 last:border-b-0 last:mb-0 last:pb-0">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between w-full mb-7 group"
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 animate-fade-in">
          {["Morning", "Afternoon", "Evening"].map(
            (slot) =>
              day.slots[slot] && (
                <ActivitySlotCard key={slot} dayNum={day.day} slot={slot} data={day.slots[slot]} tripStatus={tripStatus} />
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
  const navigate = useNavigate();

  const trip = useSelector((state) => state.trips.activeTrip);
  const trips = useSelector((state) => state.trips.trips);
  const { itinerary, loading } = useSelector((state) => state.itinerary);

  useEffect(() => {
    dispatch(fetchTripById(tripId));
    dispatch(fetchItinerary(tripId));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [tripId, dispatch]);

  const handleUpdateStatus = (newStatus) => {
    if (newStatus === "Started") {
      const hasActive = trips.some((t) => t.status === "Started" && t._id !== tripId);
      if (hasActive) {
        alert("You already have an active live trip. Please complete it first before starting another one!");
        return;
      }
    }
    dispatch(updateTripStatus({ tripId, status: newStatus }));
  };

  const handleDeleteTrip = async () => {
    if (window.confirm("Are you sure you want to delete this trip and all its itinerary data?")) {
      const result = await dispatch(deleteTrip(tripId));
      if (deleteTrip.fulfilled.match(result)) {
        navigate("/dashboard");
      }
    }
  };

  const destinationData = itinerary || {};
  const heroImage =
    trip?.coverImage ||
    "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&auto=format&fit=crop";

  const handleScrollToSection = (tag) => {
    let targetId = "";
    if (tag.includes("Hotels")) targetId = "hotel-recommendations";
    if (tag.includes("Activities")) targetId = "places-to-visit";
    if (tag.includes("Full Itinerary")) targetId = "trip-hero";
    if (tag.includes("AI Companion")) {
      const chatBtn = document.getElementById("chatbot-toggle-btn");
      if (chatBtn) chatBtn.click();
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
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-md transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                🚀 Start Trip
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
          /* Minimal plain-text schedule view for Upcoming Trips */
          <div 
            className="bg-white rounded-3xl border border-gray-150 shadow-sm max-w-4xl mx-auto mb-10"
            style={{ padding: "2.5rem" }}
          >
            <div className="mb-8 pb-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-2">Upcoming Trip Overview</h2>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">High-Level Schedule Overview</p>
            </div>

            {/* Stays info */}
            {destinationData.hotels && destinationData.hotels.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  🏨 Stays Recommended:
                </h3>
                <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1.5">
                  {destinationData.hotels.map((hotel) => (
                    <li key={hotel._id || hotel.name}>
                      <span className="font-semibold text-gray-850">{hotel.name}</span> - {hotel.location} (${hotel.pricePerNight}/night)
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Days list in plain text */}
            <div className="space-y-8">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                🗺️ Daily Timeline:
              </h3>
              {destinationData.days?.map((d) => (
                <div key={d.day} className="relative pl-6 border-l-2 border-indigo-100 last:border-l-0 pb-6 last:pb-0">
                  {/* Dot indicator */}
                  <div className="absolute left-[-6px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <h4 className="text-base font-bold text-gray-800 mb-2">
                    {d.title?.toLowerCase().startsWith("day") ? d.title : `Day ${d.day}: ${d.title}`}
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-600 pl-2">
                    {Object.entries(d.slots).map(([slotName, slotData]) => (
                      <li key={slotName} className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                        <span className="font-bold text-xs uppercase tracking-wider text-indigo-500 min-w-[90px]">
                          {slotName} ({slotData.timing}):
                        </span>
                        <span>
                          {slotData.activity} - <span className="text-gray-400 text-xs">{slotData.description}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
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
                  <DayBlock key={day.day} day={day} tripStatus={trip?.status} />
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
