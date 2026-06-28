import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { approveSuggestion, rejectSuggestion, clearActiveSuggestion } from "../store/slices/suggestionSlice";

export default function ApprovalModal() {
  const dispatch = useDispatch();
  const suggestion = useSelector((state) => state.suggestions.activeSuggestion);
  const loading = useSelector((state) => state.suggestions.loading);

  if (!suggestion) return null;

  const handleApprove = () => {
    dispatch(approveSuggestion(suggestion._id));
  };

  const handleReject = () => {
    dispatch(rejectSuggestion(suggestion._id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-6 md:p-10">
      {/* Expanded Modal Card container */}
      <div
        id="suggestion-approval-modal"
        className="w-full max-w-5xl bg-white border border-gray-200/80 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-fade-up"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-150 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3
              className="text-2xl font-extrabold text-gray-900 flex items-center gap-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <span>🔄</span> Review Suggested Changes
            </h3>
            <p className="text-sm font-semibold text-indigo-600 mt-1">
              Trigger Source: {suggestion.triggerType} ({suggestion.reason})
            </p>
          </div>
          <button
            onClick={() => dispatch(clearActiveSuggestion())}
            className="text-gray-400 hover:text-gray-800 text-3xl font-light focus:outline-none transition-colors cursor-pointer"
            id="close-approval-modal-btn"
          >
            &times;
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-8">
          {/* Explanation Alert Banner */}
          <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-start gap-4">
            <span className="text-2xl mt-0.5">💡</span>
            <div className="space-y-1">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block">
                AI Recommendation Summary
              </span>
              <p className="text-sm text-gray-700 font-medium leading-relaxed">
                {suggestion.generatedSummary || suggestion.explanation || "No explanation provided."}
              </p>
            </div>
          </div>

          {/* Grid: Before vs After comparisons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Before Snapshot */}
            <div className="space-y-4">
              <h4
                className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                <span>⚫</span> Original Schedule
              </h4>
              <div className="space-y-3.5 max-h-[40vh] overflow-y-auto pr-2">
                {suggestion.beforeSnapshot?.activities?.length > 0 ? (
                  suggestion.beforeSnapshot.activities.map((act, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gray-50 border border-gray-200 rounded-2xl shadow-sm flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <span className="text-sm font-bold text-gray-800 block">
                          {act.title}
                        </span>
                        <span className="text-xs text-gray-400 block font-medium">
                          📅 Day {act.dayNumber} · 🕐 {act.timeSlot} ({act.time || "No Time"})
                        </span>
                        {act.location && (
                          <span className="text-xs text-gray-500 block">
                            📍 {act.location}
                          </span>
                        )}
                      </div>
                      {act.cost > 0 && (
                        <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                          ₹{act.cost}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 italic">No original activities recorded.</p>
                )}
              </div>
            </div>

            {/* After Snapshot */}
            <div className="space-y-4">
              <h4
                className="text-sm font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                <span>🟢</span> Proposed Schedule
              </h4>
              <div className="space-y-3.5 max-h-[40vh] overflow-y-auto pr-2">
                {suggestion.afterSnapshot?.activities?.length > 0 ? (
                  suggestion.afterSnapshot.activities.map((act, index) => {
                    // Check if this is a newly added activity
                    const isNew = !suggestion.beforeSnapshot?.activities?.some(
                      (before) => before.title === act.title
                    );
                    // Check if this activity was moved/modified
                    const isModified = !isNew && suggestion.beforeSnapshot?.activities?.some(
                      (before) => before.title === act.title && (before.dayNumber !== act.dayNumber || before.timeSlot !== act.timeSlot)
                    );

                    return (
                      <div
                        key={index}
                        className={`p-4 border rounded-2xl shadow-sm flex items-start justify-between gap-3 transition-all ${
                          isNew
                            ? "bg-emerald-50/70 border-emerald-300 text-emerald-900"
                            : isModified
                            ? "bg-amber-50/70 border-amber-300 text-amber-900"
                            : "bg-white border-gray-200 text-gray-800"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold block">{act.title}</span>
                            {isNew && (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-600 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                New
                              </span>
                            )}
                            {isModified && (
                              <span className="text-[10px] bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                Shifted
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 block font-medium">
                            📅 Day {act.dayNumber} · 🕐 {act.timeSlot} ({act.time || "No Time"})
                          </span>
                          {act.location && (
                            <span className="text-xs text-gray-500 block">
                              📍 {act.location}
                            </span>
                          )}
                        </div>
                        {act.cost > 0 && (
                          <span className="text-xs font-semibold text-gray-600 bg-gray-150 px-2 py-0.5 rounded-md">
                            ₹{act.cost}
                          </span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-400 italic">No proposed updates generated.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t border-gray-150 flex flex-col sm:flex-row justify-between items-center gap-4">
          {/* Resource impact details */}
          <div className="text-sm text-gray-600 font-medium">
            Estimated Impact:{" "}
            <span className="text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-md mr-2">
              ⏱️ {suggestion.estimatedTimeImpact} min
            </span>
            <span className="text-amber-600 font-bold bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-md">
              💰 ₹{suggestion.estimatedBudgetImpact}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-4 w-full sm:w-auto">
            <button
              onClick={handleReject}
              disabled={loading}
              className="flex-1 sm:flex-none px-6 py-3 bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-xl font-bold text-sm transition-all cursor-pointer shadow-sm"
              id="reject-suggestion-btn"
            >
              Reject
            </button>
            <button
              onClick={handleApprove}
              disabled={loading}
              className="flex-1 sm:flex-none px-7 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              id="approve-suggestion-btn"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Updating Itinerary...</span>
                </>
              ) : (
                <span>Approve & Apply</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
