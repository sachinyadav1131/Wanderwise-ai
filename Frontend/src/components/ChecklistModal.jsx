import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { updateActivityStatusLocal } from "../store/slices/itinerarySlice";

/**
 * ChecklistModal — triggered by the ✅ Checklist feature tag.
 * Dual-column tabbed interface showing Visited / Pending activities
 * across all days, with live toggle of completion status.
 */
export default function ChecklistModal({ open, onClose, onActivityToggled }) {
  const dispatch = useDispatch();
  const itinerary = useSelector((state) => state.itinerary.itinerary);
  const activeTrip = useSelector((state) => state.trips.activeTrip);

  const [activeTab, setActiveTab] = useState("pending");
  const [togglingId, setTogglingId] = useState(null);

  // Flatten all activities from all days
  const allActivities = [];
  if (itinerary?.days) {
    for (const day of itinerary.days) {
      const acts = day.activitiesList || Object.values(day.slots || {}).filter(Boolean);
      for (const act of acts) {
        if (act && act._id) {
          allActivities.push({ ...act, _dayNum: day.day, _dayTitle: day.title });
        }
      }
    }
  }

  const visited = allActivities.filter((a) => a.status === "Completed");
  const pending = allActivities.filter((a) => a.status !== "Completed");

  const totalActivities = allActivities.length;
  const visitedCount = visited.length;
  const budgetSpent = visited.reduce((sum, a) => sum + (a.cost || 0), 0);

  const handleToggle = useCallback(async (act) => {
    if (!activeTrip || !act._id || togglingId === act._id) return;
    const nextStatus = act.status === "Completed" ? "Pending" : "Completed";
    setTogglingId(act._id);

    // Instant optimistic local update
    dispatch(updateActivityStatusLocal({ activityId: act._id, status: nextStatus }));

    try {
      const res = await axios.patch(`/api/v1/activities/${act._id}/status`, { status: nextStatus });
      if (onActivityToggled) {
        onActivityToggled(res.data?.activitySpent ?? null);
      }
    } catch (err) {
      console.error("Checklist toggle failed:", err.message);
      dispatch(updateActivityStatusLocal({ activityId: act._id, status: act.status }));
    } finally {
      setTogglingId(null);
    }
  }, [activeTrip, dispatch, onActivityToggled, togglingId]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const currentList = activeTab === "visited" ? visited : pending;
  const isStarted = activeTrip?.status === "Started";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backdropFilter: "blur(6px)", backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Trip Checklist"
    >
      <div
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "88vh" }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>
              ✅ Trip Checklist
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {visitedCount} of {totalActivities} activities visited
              {budgetSpent > 0 && <span className="ml-2 text-emerald-600 font-semibold">· ₹{budgetSpent} spent</span>}
            </p>
          </div>
          <button
            id="checklist-modal-close"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close checklist"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Progress bar ── */}
        {totalActivities > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-gray-600">Progress</span>
              <span className="text-xs font-bold text-indigo-600">
                {Math.round((visitedCount / totalActivities) * 100)}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500"
                style={{ width: `${Math.round((visitedCount / totalActivities) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex border-b border-gray-100 bg-white px-6">
          {[
            { key: "pending", label: `Pending 🕐`, count: pending.length },
            { key: "visited", label: `Visited ✅`, count: visited.length },
          ].map((tab) => (
            <button
              key={tab.key}
              id={`checklist-tab-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex items-center gap-2 py-3.5 px-4 text-sm font-bold transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? "text-indigo-600 border-b-2 border-indigo-500"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-extrabold ${
                  activeTab === tab.key ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Activity List ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {currentList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-4xl mb-3">{activeTab === "visited" ? "🏁" : "🗺️"}</span>
              <p className="text-sm font-semibold text-gray-600">
                {activeTab === "visited" ? "No activities completed yet." : "All activities are completed!"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {activeTab === "visited"
                  ? "Mark activities as visited from the card view or here."
                  : "Great job exploring everything! 🎉"}
              </p>
            </div>
          ) : (
            currentList.map((act, idx) => {
              const isCompleted = act.status === "Completed";
              const isToggling = togglingId === act._id;
              return (
                <button
                  type="button"
                  key={act._id || idx}
                  id={`checklist-item-${act._id || idx}`}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); isStarted && handleToggle(act); }}
                  disabled={!isStarted || isToggling}
                  className={`w-full flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all duration-200 ${
                    isCompleted
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-white border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40"
                  } ${!isStarted ? "opacity-60 cursor-default" : "cursor-pointer"}`}
                >
                  {/* Checkbox */}
                  <div
                    className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                      isCompleted ? "bg-emerald-500 border-emerald-500" : "border-gray-300"
                    } ${isToggling ? "animate-pulse" : ""}`}
                  >
                    {isCompleted && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                      </svg>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p
                        className={`text-sm font-semibold leading-tight ${
                          isCompleted ? "text-emerald-700 line-through opacity-70" : "text-gray-900"
                        }`}
                      >
                        {act.activity || act.title}
                      </p>
                      {(act.cost > 0) && (
                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-lg flex-shrink-0">
                          ₹{act.cost}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[11px] font-semibold text-indigo-500">
                        Day {act._dayNum}
                      </span>
                      {act.timing && (
                        <span className="text-[11px] text-gray-400">· {act.timing}</span>
                      )}
                      {act.location && (
                        <span className="text-[11px] text-gray-400 truncate">· 📍 {act.location}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* ── Footer ── */}
        {!isStarted && (
          <div className="px-6 py-4 border-t border-gray-100 bg-amber-50">
            <p className="text-xs text-amber-700 font-semibold text-center">
              ⚠️ Start your trip to toggle activity completion status.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
