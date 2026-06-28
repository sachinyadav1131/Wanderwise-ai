import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { verifyOtp, registerUser, clearAuthErrors } from "../store/slices/authSlice";

export default function OTP() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Retrieve email handed over from register; fallback to prompt if empty
  const [email, setEmail] = useState(location.state?.email || "");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", ""]);
  const [formError, setFormError] = useState("");
  const [resendTimer, setResendTimer] = useState(60);

  // References to handle split input box focusing
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];

  const { loading, error, successMessage, isAuthenticated } = useSelector((state) => state.auth);

  // Redirect to dashboard if logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  // Handle countdown timer for resending OTP
  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Clear slice messages on mount
  useEffect(() => {
    dispatch(clearAuthErrors());
  }, [dispatch]);

  // Handle individual input changes
  const handleDigitChange = (index, value) => {
    // Only accept numeric inputs
    if (value && !/^\d$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);

    // Auto-focus next input box if filled
    if (value && index < 4) {
      inputRefs[index + 1].current.focus();
    }
  };

  // Handle backspace key navigating backwards
  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs[index - 1].current.focus();
    }
  };

  // Handle copy-pasting full OTP code
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (!/^\d{5}$/.test(pastedData)) return; // verify exactly 5 digits

    const digits = pastedData.split("");
    setOtpDigits(digits);
    inputRefs[4].current.focus();
  };

  const handleResend = () => {
    if (resendTimer > 0) return;
    dispatch(registerUser({ name: "User", email, password: "TemporaryBypassPassword123" }));
    setResendTimer(60);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError("");

    const fullOtp = otpDigits.join("");

    if (!email) {
      setFormError("Please enter your registered email address.");
      return;
    }

    if (fullOtp.length < 5) {
      setFormError("Please enter all 5 digits of the code.");
      return;
    }

    dispatch(verifyOtp({ email, otp: fullOtp }));
  };

  return (
    <div className="flex-1 min-h-[85vh] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Blurred background blobs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-indigo-200/40 opacity-70 blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-teal-100/30 opacity-60 blur-3xl -z-10" />

      {/* Main Container Card */}
      <div
        id="otp-card"
        className="w-full max-w-md glass rounded-3xl p-8 sm:p-10 shadow-xl border border-white/60 animate-fade-up"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-4 shadow-md">
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2
            className="text-3xl font-extrabold text-gray-900"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Verify Account
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            Enter the 5-digit verification code sent to your email
          </p>
        </div>

        {/* Banners */}
        {(formError || error) && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-medium flex items-center gap-2.5">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{formError || error}</span>
          </div>
        )}

        {successMessage && !error && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-medium flex items-center gap-2.5">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6" id="otp-form">
          {/* Email input (only shown if email wasn't passed from register) */}
          {!location.state?.email && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Registered Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 bg-white/70 transition-all text-sm mb-4"
                placeholder="e.g. alex@wanderwise.com"
                required
              />
            </div>
          )}

          {location.state?.email && (
            <div className="text-center mb-6">
              <span className="text-xs text-gray-400">Verifying address:</span>
              <p className="text-sm font-semibold text-gray-700">{email}</p>
            </div>
          )}

          {/* 5 digit grid */}
          <div className="flex justify-between gap-2 max-w-xs mx-auto">
            {otpDigits.map((digit, index) => (
              <input
                key={index}
                ref={inputRefs[index]}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className="w-12 h-14 text-center text-xl font-bold text-gray-800 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 bg-white/70 transition-all shadow-sm"
                disabled={loading}
                autoFocus={index === 0}
              />
            ))}
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
                <span>Verifying...</span>
              </>
            ) : (
              <span>Verify Code</span>
            )}
          </button>
        </form>

        {/* Resend Actions */}
        <div className="text-center text-sm text-gray-500 mt-8">
          Didn't receive the code?{" "}
          <button
            onClick={handleResend}
            className={`font-bold transition-colors ${
              resendTimer > 0
                ? "text-gray-300 cursor-not-allowed"
                : "text-indigo-600 hover:text-indigo-700 cursor-pointer"
            }`}
            disabled={resendTimer > 0}
          >
            Resend {resendTimer > 0 && `(${resendTimer}s)`}
          </button>
        </div>
      </div>
    </div>
  );
}