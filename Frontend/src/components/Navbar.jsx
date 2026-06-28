import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

const NAV_LINKS = [
  { label: "Home",     to: "/" },
  { label: "My Trips", to: "/dashboard" },
  { label: "Plan Trip",to: "/create-trip" },
];

export default function Navbar() {
  const location = useLocation();
  const user = useSelector((state) => state.auth.user);

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/60 shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group" id="nav-logo">
          <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span
            className="text-xl font-bold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <span className="gradient-text">Wander</span>
            <span className="text-gray-800">wise</span>
          </span>
        </Link>

        {/* Nav links */}
        <ul className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(({ label, to }) => {
            const active = location.pathname === to;
            return (
              <li key={to}>
                <Link
                  to={to}
                  id={`nav-${label.toLowerCase().replace(/\s/g, "-")}`}
                  className={`px-4.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    active
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-gray-600 hover:text-indigo-600 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Auth / CTA */}
        <div className="flex items-center gap-5">
          {user ? (
            <div className="flex items-center gap-2.5">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-8 h-8 rounded-full ring-2 ring-indigo-200 object-cover"
              />
              <span className="text-sm font-semibold text-gray-700 hidden sm:block">
                {user.name}
              </span>
            </div>
          ) : (
            <>
              <Link
                to="/login"
                id="nav-login-link"
                className="text-sm font-bold text-gray-600 hover:text-indigo-600 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                id="nav-cta"
                className="px-4.5 py-2.5 rounded-xl text-sm font-bold text-white gradient-brand shadow-md hover:opacity-90 hover:scale-105 transition-all"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
