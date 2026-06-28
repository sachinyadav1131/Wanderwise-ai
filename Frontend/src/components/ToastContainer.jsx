import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { removeToast } from "../store/slices/toastSlice";

function ToastItem({ id, message, type, duration }) {
  const dispatch = useDispatch();

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(removeToast(id));
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, dispatch]);

  const styleMap = {
    success: {
      border: "border-emerald-500/20",
      bgIcon: "bg-emerald-500/20 text-emerald-400",
      progressBg: "bg-emerald-500",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    error: {
      border: "border-rose-500/20",
      bgIcon: "bg-rose-500/20 text-rose-400",
      progressBg: "bg-rose-500",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
    info: {
      border: "border-indigo-500/20",
      bgIcon: "bg-indigo-500/20 text-indigo-400",
      progressBg: "bg-indigo-500",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  };

  const currentStyle = styleMap[type] || styleMap.success;

  return (
    <div
      className={`w-80 bg-gray-900/95 border ${currentStyle.border} text-white shadow-2xl rounded-2xl overflow-hidden flex flex-col relative animate-slide-in-left`}
      style={{ backdropFilter: "blur(12px)" }}
    >
      <div className="p-4 flex items-start gap-3">
        {/* Type Icon */}
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${currentStyle.bgIcon}`}>
          {currentStyle.icon}
        </div>
        {/* Message */}
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-sm font-semibold leading-snug tracking-tight text-gray-100 break-words pr-2">
            {message}
          </p>
        </div>
        {/* Close Button */}
        <button
          onClick={() => dispatch(removeToast(id))}
          className="text-gray-400 hover:text-white transition-colors text-lg focus:outline-none flex-shrink-0 cursor-pointer"
        >
          &times;
        </button>
      </div>
      {/* Animated Progress Bar */}
      <div className="w-full h-1 bg-gray-800">
        <div
          className={`h-full ${currentStyle.progressBg} animate-shrink`}
          style={{ animationDuration: `${duration}ms` }}
        />
      </div>
    </div>
  );
}

export default function ToastContainer() {
  const toasts = useSelector((state) => state.toast.toasts);

  return (
    <div className="fixed bottom-6 left-6 z-[9999] flex flex-col gap-3.5 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem {...toast} />
        </div>
      ))}
    </div>
  );
}
