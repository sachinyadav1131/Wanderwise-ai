import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { loadCurrentUser } from "./store/slices/authSlice";

// Layout & Components
import Navbar from "./components/Navbar";
import Layout from "./layout/Layout";
import ApprovalModal from "./popups/ApprovalModal";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Pages
import Home from "./pages/Home";
import CreateTrip from "./pages/CreateTrip";
import Dashboard from "./pages/Dashboard";
import TripDetails from "./pages/TripDetails";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import OTP from "./pages/OTP";
import ResetPassword from "./pages/ResetPassword";

// ─── Route Guard: Only accessible to logged-in users ────────────────────────
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useSelector((state) => state.auth);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// ─── Route Guard: Only accessible to non-logged-in users (auth pages) ───────
function GuestRoute({ children }) {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

function App() {
  const dispatch = useDispatch();

  // Load current user profile from cookie session on initial mount
  useEffect(() => {
    dispatch(loadCurrentUser());
  }, [dispatch]);

  return (
    <BrowserRouter>
      {/* Page Routing Engine */}
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<><Navbar /><Home /></>} />

        {/* Authentication Pages (Only visible if not logged in - includes standard landing Navbar) */}
        <Route
          path="/login"
          element={
            <GuestRoute>
              <>
                <Navbar />
                <Login />
              </>
            </GuestRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestRoute>
              <>
                <Navbar />
                <Register />
              </>
            </GuestRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <GuestRoute>
              <>
                <Navbar />
                <ForgotPassword />
              </>
            </GuestRoute>
          }
        />
        <Route
          path="/verify-otp"
          element={
            <GuestRoute>
              <>
                <Navbar />
                <OTP />
              </>
            </GuestRoute>
          }
        />
        <Route
          path="/reset-password/:token"
          element={
            <GuestRoute>
              <>
                <Navbar />
                <ResetPassword />
              </>
            </GuestRoute>
          }
        />

        {/* Protected Trip Planning & Progress Pages wrapped in SideBar+Header Layout */}
        <Route
          path="/create-trip"
          element={
            <ProtectedRoute>
              <Layout>
                <CreateTrip />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/trip/:tripId"
          element={
            <ProtectedRoute>
              <Layout>
                <TripDetails />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* 404 Fallback page */}
        <Route
          path="*"
          element={
            <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
              <p className="text-6xl mb-4">🗺️</p>
              <h1
                className="text-3xl font-extrabold text-gray-900 mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
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

      {/* Global AI suggestion feedback audit modal */}
      <ApprovalModal />
      
      {/* Global Toast Notification Container */}
      <ToastContainer position="bottom-left" autoClose={4000} theme="light" />
    </BrowserRouter>
  );
}

export default App;