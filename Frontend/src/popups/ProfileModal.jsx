import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updatePassword } from "../store/slices/authSlice";

export default function ProfileModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const loading = useSelector((state) => state.auth.loading);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [formError, setFormError] = useState("");

  if (!isOpen) return null;

  const handlePasswordUpdate = (e) => {
    e.preventDefault();
    setFormError("");

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setFormError("All fields are required.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setFormError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8 || newPassword.length > 16) {
      setFormError("Password must be between 8 and 16 characters.");
      return;
    }

    dispatch(updatePassword({ currentPassword, newPassword, confirmNewPassword }))
      .unwrap()
      .then(() => {
        onClose();
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      })
      .catch((err) => {
        setFormError(err || "Failed to update password.");
      });
  };

  const handleClose = () => {
    onClose();
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setFormError("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      {/* Modal Card wrapper */}
      <div
        id="profile-password-modal"
        className="w-full max-w-md bg-white border border-gray-200 rounded-3xl p-8 shadow-2xl relative animate-fade-up"
      >
        {/* Header */}
        <h3
          className="text-2xl font-extrabold text-gray-900 mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Update Password
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          Change your password credentials securely
        </p>

        {/* Error Alert Box */}
        {formError && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-medium flex items-center gap-2.5">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{formError}</span>
          </div>
        )}

        {/* Password update form */}
        <form onSubmit={handlePasswordUpdate} className="space-y-4" id="password-update-form">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 bg-white/70 transition-all text-sm"
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 bg-white/70 transition-all text-sm"
              placeholder="Min 8 characters"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 bg-white/70 transition-all text-sm"
              placeholder="Repeat new password"
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-xl font-bold text-sm transition-all cursor-pointer shadow-sm"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              disabled={loading}
            >
              {loading ? "Updating..." : "Save Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
