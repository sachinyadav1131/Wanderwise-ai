import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { resetPassword, clearAuthErrors } from "../store/slices/authSlice";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState("");

  const { loading, error, successMessage, isAuthenticated } = useSelector((state) => state.auth);

  // Redirect to dashboard if session verified or updated
  useEffect(() => {
    if (isAuthenticated) {
      const timer = setTimeout(() => {
        navigate("/dashboard");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, navigate]);

  // Clean error state on mount
  useEffect(() => {
    dispatch(clearAuthErrors());
  }, [dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError("");

    // Form validations
    if (!password || !confirmPassword) {
      setFormError("All fields are required.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    if (password.length < 8 || password.length > 16) {
      setFormError("Password must be between 8 and 16 characters.");
      return;
    }

    dispatch(resetPassword({ token, password, confirmPassword }));
  };

  return (
    <div className="flex-1 min-h-[85vh] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Blurred background blobs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-indigo-200/40 opacity-70 blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-teal-100/30 opacity-60 blur-3xl -z-10" />

      {/* Main Card */}
      <div
        id="reset-password-card"
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
            New Password
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            Enter your new secure password credentials
          </p>
        </div>

        {/* Success / Redirect state */}
        {isAuthenticated && successMessage ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto text-emerald-600">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-800">Success!</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Your password has been reset successfully. You are now logged in.
            </p>
            <p className="text-xs text-indigo-500 animate-pulse">
              Redirecting you to the dashboard...
            </p>
          </div>
        ) : (
          /* Form state */
          <>
            {(formError || error) && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-medium flex items-center gap-2.5">
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{formError || error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" id="reset-password-form">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 bg-white/70 transition-all text-sm"
                  placeholder="Min 8 characters"
                  disabled={loading}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 bg-white/70 transition-all text-sm"
                  placeholder="Confirm password"
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
                    <span>Updating password...</span>
                  </>
                ) : (
                  <span>Reset Password</span>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-8">
              Back to{" "}
              <Link
                to="/login"
                className="font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}