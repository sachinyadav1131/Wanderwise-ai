import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { loginUser, clearAuthErrors } from "../store/slices/authSlice";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);

  // Redirect to dashboard if logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  // Clear errors when entering page
  useEffect(() => {
    dispatch(clearAuthErrors());
  }, [dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError("");

    // Client-side validations
    if (!email || !password) {
      setFormError("All fields are required.");
      return;
    }

    dispatch(loginUser({ email, password }));
  };

  return (
    <div className="flex-1 min-h-[85vh] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Dynamic blurred background shapes */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-indigo-200/40 opacity-70 blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-teal-100/30 opacity-60 blur-3xl -z-10" />

      {/* Main card */}
      <div
        id="login-card"
        className="w-full max-w-md glass rounded-3xl p-8 sm:p-10 shadow-xl border border-white/60 animate-fade-up"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-4 shadow-md">
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2
            className="text-3xl font-extrabold text-gray-900"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Welcome Back
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            Log in to continue planning your adventures
          </p>
        </div>

        {/* Error Banners */}
        {(formError || error) && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-medium flex items-center gap-2.5">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{formError || error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5" id="login-form">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 bg-white/70 transition-all text-sm"
              placeholder="e.g. alex@wanderwise.com"
              disabled={loading}
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                Forgot Password?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 bg-white/70 transition-all text-sm"
              placeholder="••••••••"
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl font-bold text-white gradient-brand shadow-lg hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer mt-6"
            disabled={loading}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Logging in...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-8">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}