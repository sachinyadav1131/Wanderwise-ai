import React from "react";
import { Link } from "react-router-dom";

// ─── Feature Data ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: "AI-Powered Itineraries",
    description:
      "Our multi-agent pipeline crafts personalised day-by-day plans tailored to your budget, interests, and travel style.",
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    title: "Live Trip Companion",
    description:
      "Chat with your AI trip companion in real-time. Request route changes, get local tips, and handle weather detours on the fly.",
    color: "bg-purple-50 text-purple-600",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "Smart Hotel Picks",
    description:
      "Curated hotel recommendations matched to your budget tier — from cosy hostels to five-star luxury, all with live pricing.",
    color: "bg-teal-50 text-teal-600",
  },
];

// ─── Mock Dashboard Preview ───────────────────────────────────────────────────

const PREVIEW_TRIPS = [
  { city: "Kyoto", days: 7, emoji: "🗾" },
  { city: "Santorini", days: 5, emoji: "🇬🇷" },
  { city: "Bali", days: 10, emoji: "🌴" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="flex-1 overflow-x-hidden">
      {/* ── Hero Section ─────────────────────────────────────────────────────── */}
      <section
        id="hero"
        className="relative min-h-[92vh] flex flex-col items-center justify-center px-4 text-center overflow-hidden"
      >
        {/* Background blobs */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-100 opacity-60 blur-3xl" />
          <div className="absolute top-20 right-0 w-80 h-80 rounded-full bg-purple-100 opacity-50 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 w-[600px] h-64 -translate-x-1/2 rounded-full bg-teal-50 opacity-70 blur-3xl" />
        </div>

        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-6 animate-fade-in"
          style={{ background: "rgba(99,102,241,0.08)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.2)" }}
        >
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          Powered by Multi-Agent AI
        </div>

        {/* Headline */}
        <h1
          className="text-5xl sm:text-6xl lg:text-7xl font-extrabold max-w-4xl leading-[1.1] animate-fade-up"
          style={{ fontFamily: "var(--font-display)", animationDelay: "0.1s", opacity: 0 }}
        >
          Discover Your Next{" "}
          <span className="gradient-text">Adventure</span> with AI
        </h1>

        {/* Subheadline */}
        <p
          className="mt-6 text-lg sm:text-xl text-gray-500 max-w-2xl leading-relaxed animate-fade-up"
          style={{ animationDelay: "0.2s", opacity: 0 }}
        >
          Personalised itineraries at your fingertips. Tell us where you want to go,
          your budget, and your crew — our AI builds your perfect trip in seconds.
        </p>

        {/* CTA Buttons */}
        <div
          className="mt-10 flex flex-col sm:flex-row items-center gap-4 animate-fade-up"
          style={{ animationDelay: "0.3s", opacity: 0 }}
        >
          <Link
            id="hero-cta-primary"
            to="/create-trip"
            className="group px-8 py-4 rounded-2xl text-white font-bold text-lg gradient-brand shadow-lg hover:opacity-90 hover:scale-105 transition-all flex items-center gap-2"
          >
            Get Started, It's free
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <Link
            id="hero-cta-secondary"
            to="/dashboard"
            className="px-8 py-4 rounded-2xl text-gray-700 font-bold text-lg bg-white border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all shadow-sm"
          >
            View My Trips
          </Link>
        </div>

        {/* Trust badges */}
        <p
          className="mt-8 text-sm text-gray-400 animate-fade-up"
          style={{ animationDelay: "0.4s", opacity: 0 }}
        >
          ✓ No credit card required &nbsp;·&nbsp; ✓ Instant AI generation &nbsp;·&nbsp; ✓ 100% free to start
        </p>

        {/* ── Laptop Mockup ─────────────────────────────────────────────────── */}
        <div
          className="mt-16 w-full max-w-5xl animate-fade-up animate-float"
          style={{ animationDelay: "0.5s", opacity: 0 }}
          id="laptop-mockup"
        >
          {/* Laptop frame */}
          <div className="relative mx-auto" style={{ maxWidth: "860px" }}>
            {/* Screen bezel */}
            <div className="relative bg-gray-900 rounded-2xl p-3 shadow-2xl" style={{ boxShadow: "0 40px 80px rgba(99,102,241,0.25), 0 0 0 1px rgba(0,0,0,0.1)" }}>
              {/* Traffic lights */}
              <div className="flex items-center gap-1.5 mb-2.5 px-1">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>

              {/* Screen content — mini dashboard preview */}
              <div className="rounded-xl overflow-hidden bg-gray-50">
                {/* Mini navbar */}
                <div className="flex items-center gap-4 px-4 py-2.5 bg-white border-b border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-md gradient-brand" />
                    <span className="text-xs font-bold text-gray-700" style={{ fontFamily: "var(--font-display)" }}>Wanderwise</span>
                  </div>
                  <div className="flex gap-3 ml-4">
                    {["Home", "My Trips", "Plan Trip"].map((t) => (
                      <span key={t} className="text-[10px] text-gray-400 font-medium">{t}</span>
                    ))}
                  </div>
                </div>

                {/* Mini trip grid */}
                <div className="p-4">
                  <p className="text-xs font-bold text-gray-600 mb-3" style={{ fontFamily: "var(--font-display)" }}>My Trips</p>
                  <div className="grid grid-cols-3 gap-3">
                    {PREVIEW_TRIPS.map(({ city, days, emoji }) => (
                      <div key={city} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm card-hover">
                        {/* Coloured thumbnail */}
                        <div className="h-14 gradient-brand flex items-center justify-center text-2xl">{emoji}</div>
                        <div className="p-2">
                          <p className="text-[10px] font-bold text-gray-800">{city}</p>
                          <p className="text-[9px] text-gray-400 mt-0.5">{days} days</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Laptop base */}
            <div className="h-3 bg-gray-800 rounded-b-xl mx-6 shadow-md" />
            <div className="h-1.5 bg-gray-700 rounded-b-lg mx-2 shadow-sm" />
          </div>
        </div>
      </section>

      {/* ── Features Section ─────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-bold uppercase tracking-widest text-indigo-500 mb-3">Why WanderWise</p>
          <h2
            className="text-4xl sm:text-5xl font-extrabold text-gray-900"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Travel smarter, not harder
          </h2>
          <p className="mt-4 text-gray-500 max-w-xl mx-auto">
            Everything you need to plan, execute, and remember an extraordinary trip — all in one place.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8" id="feature-cards">
          {FEATURES.map(({ icon, title, description, color }, i) => (
            <div
              key={title}
              className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm card-hover"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${color}`}>
                {icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: "var(--font-display)" }}>
                {title}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────────────────── */}
      <section id="cta-banner" className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center bg-white border border-indigo-100 rounded-3xl shadow-xl p-12" style={{ background: "linear-gradient(135deg, #f0f4ff, #faf5ff)" }}>
          <h2
            className="text-4xl font-extrabold text-gray-900 mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Ready to explore the world?
          </h2>
          <p className="text-gray-500 mb-8">
            Join thousands of travellers who've planned their dream trips with WanderWise AI.
          </p>
          <Link
            id="bottom-cta"
            to="/create-trip"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-white font-bold text-lg gradient-brand shadow-lg hover:opacity-90 hover:scale-105 transition-all"
          >
            Start Planning Now
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="py-8 px-4 border-t border-gray-100 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} WanderWise AI. Built with ❤️ and multi-agent intelligence.
      </footer>
    </div>
  );
}
