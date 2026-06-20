import React from "react";
import { useDispatch } from "react-redux";
import { setActiveSuggestion } from "../store/slices/suggestionSlice";

export default function SuggestionCard({ suggestion }) {
  const dispatch = useDispatch();

  if (!suggestion || suggestion.status !== "Pending") return null;

  return (
    <div className="mt-3 p-4 bg-slate-800/80 border border-slate-700 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-amber-400 tracking-wide uppercase">AI Recommendation</span>
        <span className="text-xs text-slate-400">
          Budget: {suggestion.estimatedBudgetImpact >= 0 ? `+$${suggestion.estimatedBudgetImpact}` : `-$${Math.abs(suggestion.estimatedBudgetImpact)}`}
        </span>
      </div>
      
      <p className="text-sm font-semibold text-white">{suggestion.generatedSummary}</p>
      
      <div className="flex gap-2">
        <button
          onClick={() => dispatch(setActiveSuggestion(suggestion))}
          className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors"
        >
          Review & Approve
        </button>
      </div>
    </div>
  );
}
