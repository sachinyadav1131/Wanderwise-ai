import React from "react";
import ChatPanel from "./components/ChatPanel";
import ApprovalModal from "./popups/ApprovalModal";

function App() {
  // Use a default/mock trip ID for demo purposes
  const tripId = "60c72b2f9b1d8b2d88c29377";

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-white overflow-hidden font-sans">
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
        <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
          Wanderwise AI Dashboard
        </h1>
        <p className="text-slate-400 max-w-md text-center">
          Active Trip: <strong>Delhi Day Exploration</strong>. Use the companion chatbot on the right to request rescheduling or trigger weather detours.
        </p>
        <div className="mt-8 p-6 bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl text-center space-y-3">
          <h2 className="text-lg font-bold text-white">Interactive Suggestions Demo</h2>
          <p className="text-sm text-slate-450">
            Type <code className="bg-slate-800 px-1.5 py-0.5 rounded text-blue-400">rain</code> or <code className="bg-slate-800 px-1.5 py-0.5 rounded text-blue-400">move India Gate</code> in the sidebar chat on the right to simulate change suggestions.
          </p>
        </div>
      </div>

      <ChatPanel tripId={tripId} />
      <ApprovalModal />
    </div>
  );
}

export default App;
