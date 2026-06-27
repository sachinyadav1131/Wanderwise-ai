import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import ApprovalModal from "./popups/ApprovalModal";

// Pages
import Home from "./pages/Home";
import CreateTrip from "./pages/CreateTrip";
import Dashboard from "./pages/Dashboard";
import TripDetails from "./pages/TripDetails";

function App() {
  return (
    <BrowserRouter>
      {/* Global sticky nav */}
      <Navbar />

      {/* Page routes */}
      <Routes>
        <Route path="/"            element={<Home />} />
        <Route path="/create-trip" element={<CreateTrip />} />
        <Route path="/dashboard"   element={<Dashboard />} />
        <Route path="/trip/:tripId" element={<TripDetails />} />

        {/* 404 fallback */}
        <Route
          path="*"
          element={
            <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
              <p className="text-6xl mb-4">🗺️</p>
              <h1 className="text-3xl font-extrabold text-gray-900 mb-2" style={{ fontFamily: "var(--font-display)" }}>
                Page not found
              </h1>
              <p className="text-gray-500 mb-6 text-sm">
                Looks like this route wandered off the map.
              </p>
              <a
                href="/"
                className="px-6 py-3 rounded-xl text-white font-bold text-sm gradient-brand shadow-md hover:opacity-90 transition-all"
              >
                Back to Home
              </a>
            </div>
          }
        />
      </Routes>

      {/* Global approval modal (suggestion review) */}
      <ApprovalModal />
    </BrowserRouter>
  );
}

export default App;
