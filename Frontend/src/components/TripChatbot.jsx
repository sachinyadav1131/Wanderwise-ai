import React, { useState } from "react";
import ChatPanel from "./ChatPanel";

/**
 * TripChatbot — right-hand slide-in panel wrapping the existing ChatPanel.
 * Includes a floating toggle button so it can be shown/hidden.
 */
export default function TripChatbot({ tripId }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating toggle button */}
      <button
        id="chatbot-toggle"
        onClick={() => setOpen((v) => !v)}
        title={open ? "Close Chat" : "Open AI Companion"}
        className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110 gradient-brand ${
          open ? "rotate-45" : ""
        }`}
      >
        {open ? (
          // X icon when open
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          // Chat bubble icon
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Slide-in chat panel */}
      {open && (
        <div
          id="chatbot-panel"
          className="fixed right-0 top-0 bottom-0 z-30 animate-slide-in-right shadow-2xl"
          style={{ width: "340px" }}
        >
          <ChatPanel tripId={tripId} />
        </div>
      )}
    </>
  );
}
