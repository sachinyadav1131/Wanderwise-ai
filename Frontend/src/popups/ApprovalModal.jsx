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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Review Suggested Changes</h3>
            <p className="text-xs text-slate-400 mt-1">{suggestion.reason}</p>
          </div>
          <button onClick={() => dispatch(clearActiveSuggestion())} className="text-slate-400 hover:text-white">&times;</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Before Snapshot */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-400 uppercase">Original Plan (Before)</h4>
            <div className="space-y-3">
              {suggestion.beforeSnapshot?.activities?.map((a, i) => (
                <div key={i} className="p-3 bg-slate-950 border border-slate-850 rounded-xl">
                  <div className="font-semibold text-slate-300 text-sm">{a.title}</div>
                  <div className="text-xs text-slate-500">Day {a.dayNumber} - {a.timeSlot}</div>
                </div>
              ))}
            </div>
          </div>

          {/* After Snapshot */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-emerald-400 uppercase">Proposed Plan (After)</h4>
            <div className="space-y-3">
              {suggestion.afterSnapshot?.activities?.map((a, i) => {
                const isNew = !suggestion.beforeSnapshot?.activities?.some(b => b.title === a.title);
                return (
                  <div key={i} className={`p-3 border rounded-xl ${isNew ? "bg-emerald-500/10 border-emerald-500/30" : "bg-slate-950 border-slate-850"}`}>
                    <div className="flex justify-between items-center">
                      <div className="font-semibold text-white text-sm">{a.title}</div>
                      {isNew && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase">New</span>}
                    </div>
                    <div className="text-xs text-slate-500">Day {a.dayNumber} - {a.timeSlot}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-5 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
          <div className="text-sm text-slate-400">
            Estimated Impact: <span className="text-emerald-400 font-semibold">{suggestion.estimatedTimeImpact}m time</span> | <span className="text-amber-400 font-semibold">${suggestion.estimatedBudgetImpact} cost</span>
          </div>
          <div className="flex gap-3">
            <button onClick={handleReject} disabled={loading} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700">
              Reject
            </button>
            <button onClick={handleApprove} disabled={loading} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg">
              {loading ? "Applying..." : "Approve & Apply"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
