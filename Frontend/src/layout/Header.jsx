import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logoutUser } from "../store/slices/authSlice";
import ProfileModal from "../popups/ProfileModal";

export default function Header() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const user = useSelector((state) => state.auth.user);
  const tripsCount = useSelector((state) => state.trips.trips.length);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logoutUser()).then(() => {
      navigate("/login");
    });
  };

  const avatarUrl = user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || "Traveler")}&background=6366f1&color=fff`;

  return (
    <>
      <header className="h-16 bg-white border-b border-gray-150 flex items-center justify-between px-6 sm:px-8 sticky top-0 z-30 shadow-sm">
        {/* Search Bar Container */}
        <div className="flex-1 max-w-md hidden sm:block">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search trips, destinations, or tags..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all"
              id="header-search-catalog"
            />
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-4 ml-auto">
          {/* Trips stats badge */}
          <div
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-100"
            id="header-stats-badge"
          >
            <span>💼</span>
            <span>{tripsCount} Adventure{tripsCount !== 1 && "s"}</span>
          </div>

          {/* Notifications Button */}
          <button
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all relative cursor-pointer"
            id="header-notification-bell"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
          </button>

          {/* Profile Dropdown Trigger */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-3 border-l border-gray-100 pl-4 hover:opacity-90 focus:outline-none transition-all cursor-pointer"
                id="header-user-dropdown-btn"
              >
                <img
                  src={avatarUrl}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-50/50"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=fff`;
                  }}
                />
                <div className="hidden md:block text-left">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wide">
                    Traveler
                  </span>
                  <span className="block text-sm font-bold text-gray-700 leading-tight">
                    {user.name.split(" ")[0]}
                  </span>
                </div>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Profile Dropdown Popover */}
              {dropdownOpen && (
                <>
                  {/* Overlay to close on outside click */}
                  <div className="fixed inset-0 z-30" onClick={() => setDropdownOpen(false)} />
                  <div
                    id="profile-dropdown-menu"
                    className="absolute right-0 mt-3.5 w-64 bg-white border border-gray-150 rounded-2xl shadow-xl py-4 z-40 animate-fade-in"
                  >
                    {/* User info summary card */}
                    <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3.5 mb-2.5">
                      <img
                        src={avatarUrl}
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-50/50"
                      />
                      <div className="min-w-0 flex flex-col gap-0.5">
                        <p className="text-sm font-bold text-gray-800 truncate leading-tight">{user.name}</p>
                        <p className="text-xs text-gray-400 truncate leading-normal">{user.email}</p>
                      </div>
                    </div>

                    {/* Actions list */}
                    <div className="space-y-1.5 px-2">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          setModalOpen(true);
                        }}
                        className="w-full px-4 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-3.5 rounded-xl transition-all cursor-pointer"
                        id="dropdown-change-password-btn"
                      >
                        <svg className="w-4.5 h-4.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m-5-3a5 5 0 0110 0v4a5 5 0 01-10 0V6zM4 20v-1a4 4 0 018 0v1H4z" />
                        </svg>
                        Change Password
                      </button>

                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full px-4 py-3 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-3.5 rounded-xl transition-all cursor-pointer"
                        id="dropdown-logout-btn"
                      >
                        <svg className="w-4.5 h-4.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Log Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Centralised Password Change Dialog Modal */}
      <ProfileModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}