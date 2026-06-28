import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logoutUser } from "../store/slices/authSlice";

export default function SideBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const user = useSelector((state) => state.auth.user);
  const activeTrip = useSelector((state) => 
    state.trips.trips.find(trip => trip.status === "Started")
  );

  const handleLogout = () => {
    dispatch(logoutUser()).then(() => {
      navigate("/login");
    });
  };

  const navItems = [
    {
      label: "My Trips",
      to: "/dashboard",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: "Plan New Trip",
      to: "/create-trip",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
    },
  ];

  return (
    <aside
      className="w-64 bg-[#111827] text-gray-300 flex flex-col h-screen fixed left-0 top-0 z-40 border-r border-gray-800 shadow-xl"
      style={{ width: "256px" }}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-gray-800">
        <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center shadow-md">
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span className="text-xl font-bold tracking-tight text-white" style={{ fontFamily: "var(--font-display)" }}>
          <span className="text-indigo-400">Wander</span>wise
        </span>
      </div>

      {/* Main Nav Links */}
      <div className="flex-1 px-4 py-6 space-y-7 overflow-y-auto">
        <div className="space-y-4">
          <span className="px-3 text-xs font-bold text-gray-500 uppercase tracking-widest block mb-3">
            Core Features
          </span>
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                id={`sidebar-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-base font-bold transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
                    : "hover:bg-gray-800 hover:text-white"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Conditional Active Trip Link */}
        {activeTrip && (
          <div className="space-y-4">
            <span className="px-3 text-xs font-bold text-gray-500 uppercase tracking-widest block mb-3">
              Active Session
            </span>
            <Link
              to={`/trip/${activeTrip._id}`}
              id="sidebar-active-trip"
              className={`flex items-center justify-between px-4 py-3.5 rounded-2xl text-base font-bold border border-dashed transition-all ${
                location.pathname === `/trip/${activeTrip._id}`
                  ? "border-indigo-500 bg-indigo-500/10 text-white"
                  : "border-gray-800 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="truncate max-w-30">{activeTrip.destination}</span>
              </div>
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}
      </div>

      {/* User Session Footer & Log Out */}
      <div className="p-4 border-t border-gray-800 space-y-4">
        {user && (
          <div className="flex items-center gap-3 px-2">
            <img
              src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=fff`}
              alt={user.name}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-gray-800"
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=fff`;
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          id="sidebar-logout"
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600/10 text-rose-500 hover:bg-rose-600 hover:text-white font-bold text-sm transition-all cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Log Out
        </button>
      </div>
    </aside>
  );
}