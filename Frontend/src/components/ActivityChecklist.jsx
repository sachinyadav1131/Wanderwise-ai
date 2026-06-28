import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { toggleActivity } from "../store/slices/activitySlice";

/**
 * ActivityChecklist
 * Props:
 *   activityId  – unique string key  (e.g., "day1-morning")
 *   label       – activity title text
 *   timing      – optional time string
 *   description – optional short description
 */
export default function ActivityChecklist({ activityId, label, timing, description, disabled }) {
  const dispatch = useDispatch();
  const isComplete = useSelector(
    (state) => !!state.activity.completedActivities[activityId]
  );

  const containerClasses = `w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-200 ${
    isComplete
      ? "bg-emerald-50 border-emerald-200"
      : "bg-white border-gray-200"
  } ${
    disabled 
      ? "" 
      : "group hover:border-indigo-300 hover:bg-indigo-50/40 cursor-pointer"
  }`;

  const handleClick = () => {
    if (!disabled) {
      dispatch(toggleActivity(activityId));
    }
  };

  const Component = disabled ? "div" : "button";

  return (
    <Component
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
