import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { createTrip } from "../store/slices/tripSlice";

// ─── Option Data ─────────────────────────────────────────────────────────────

const BUDGET_OPTIONS = [
  {
    id: "Cheap",
    label: "Cheap",
    icon: "🎒",
    description: "Budget-friendly hostels, street food & public transport",
    priceRange: "< $50/day",
  },
  {
    id: "Moderate",
    label: "Moderate",
    icon: "🏨",
    description: "3-star hotels, local restaurants & occasional taxis",
    priceRange: "$50–$150/day",
  },
  {
    id: "Luxury",
    label: "Luxury",
    icon: "✨",
    description: "5-star resorts, fine dining & private transfers",
    priceRange: "$150+/day",
  },
];

const COMPANION_OPTIONS = [
  { id: "Just Me",  label: "Just Me",  icon: "🧍", description: "Solo adventure, full freedom" },
  { id: "A Couple", label: "A Couple", icon: "👫", description: "Romantic getaway for two" },
  { id: "Family",   label: "Family",   icon: "👨‍👩‍👧‍👦", description: "Fun for all ages" },
  { id: "Friends",  label: "Friends",  icon: "🎉", description: "Squad trip, unforgettable" },
];

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-10">
      {Array.from({ length: total }).map((_, i) => (
        <React.Fragment key={i}>
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300 ${
              i < current
                ? "gradient-brand text-white shadow-md"
                : i === current
                ? "bg-white border-2 border-indigo-500 text-indigo-600"
                : "bg-gray-100 text-gray-400 border-2 border-gray-200"
            }`}
          >
            {i < current ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
              </svg>
            ) : (
              i + 1
            )}
          </div>
          {i < total - 1 && (
            <div className={`h-0.5 w-12 rounded-full transition-all duration-300 ${i < current ? "gradient-brand" : "bg-gray-200"}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Selectable Card ─────────────────────────────────────────────────────────

function SelectCard({ item, selected, onSelect }) {
  return (
    <button
      id={`select-${item.id.toLowerCase().replace(/\s/g, "-")}`}
      onClick={() => onSelect(item.id)}
      className={`relative w-full p-5 rounded-2xl border-2 text-left transition-all duration-200 group ${
        selected
          ? "border-indigo-500 bg-indigo-50 shadow-md"
          : "border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30"
      }`}
    >
      {selected && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full gradient-brand flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
          </svg>
        </div>
      )}
      <span className="text-3xl mb-3 block">{item.icon}</span>
      <p className={`font-bold text-base mb-1 ${selected ? "text-indigo-700" : "text-gray-800"}`}>
        {item.label}
      </p>
      <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>
      {item.priceRange && (
        <span className={`inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-md ${selected ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500"}`}>
          {item.priceRange}
        </span>
      )}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CreateTrip() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const loading = useSelector((state) => state.trips.loading);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    destination: "",
    duration: "",
    budget: "",
    companions: "",
  });
  const [errors, setErrors] = useState({});

  const TOTAL_STEPS = 3;

  // Validation per step
  const validate = () => {
    const newErrors = {};
    if (step === 0) {
      if (!form.destination.trim()) newErrors.destination = "Please enter a destination.";
      if (!form.duration || isNaN(form.duration) || Number(form.duration) < 1)
        newErrors.duration = "Enter a valid number of days (min 1).";
      if (Number(form.duration) > 30)
        newErrors.duration = "Max 30 days.";
    }
    if (step === 1 && !form.budget) newErrors.budget = "Please select a budget tier.";
    if (step === 2 && !form.companions) newErrors.companions = "Please select who's coming.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    if (!validate()) return;
    const result = await dispatch(createTrip(form));
    if (createTrip.fulfilled.match(result)) {
      navigate("/dashboard");
    }
  };

  const STEP_META = [
    { title: "Where to?", subtitle: "Tell us your destination and how long you're going." },
    { title: "What's your budget?", subtitle: "We'll tailor recommendations to your spending comfort." },
    { title: "Who's joining?", subtitle: "So we can optimise activities for your travel group." },
  ];

  return (
    <div className="flex-1 min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12" style={{ background: "linear-gradient(150deg, #f0f4ff 0%, #faf5ff 50%, #f0fdfa 100%)" }}>
      <div className="w-full max-w-2xl">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 sm:p-12">
          {/* Header */}
          <div className="text-center mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">
              Step {step + 1} of {TOTAL_STEPS}
            </p>
            <h1
              className="text-3xl sm:text-4xl font-extrabold text-gray-900"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {STEP_META[step].title}
            </h1>
            <p className="text-gray-500 mt-2 text-sm">{STEP_META[step].subtitle}</p>
          </div>

          <StepIndicator current={step} total={TOTAL_STEPS} />

          {/* ── Step 0: Destination + Duration ─────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="destination-input">
                  Destination
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>
                  <input
                    id="destination-input"
                    type="text"
                    placeholder="e.g. Kyoto, Japan"
                    value={form.destination}
                    onChange={(e) => setForm({ ...form, destination: e.target.value })}
                    className={`w-full pl-10 pr-4 py-3.5 rounded-xl border text-gray-900 placeholder-gray-400 text-sm font-medium outline-none transition-all ${
                      errors.destination
                        ? "border-red-400 bg-red-50"
                        : "border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    }`}
                  />
                </div>
                {errors.destination && <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.destination}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="duration-input">
                  Number of Days
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <input
                    id="duration-input"
                    type="number"
                    min="1"
                    max="30"
                    placeholder="e.g. 7"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    className={`w-full pl-10 pr-4 py-3.5 rounded-xl border text-gray-900 placeholder-gray-400 text-sm font-medium outline-none transition-all ${
                      errors.duration
                        ? "border-red-400 bg-red-50"
                        : "border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    }`}
                  />
                </div>
                {errors.duration && <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.duration}</p>}
              </div>
            </div>
          )}

          {/* ── Step 1: Budget ──────────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-3 animate-fade-in">
              {BUDGET_OPTIONS.map((opt) => (
                <SelectCard
                  key={opt.id}
                  item={opt}
                  selected={form.budget === opt.id}
                  onSelect={(id) => setForm({ ...form, budget: id })}
                />
              ))}
              {errors.budget && <p className="text-xs text-red-500 mt-1 font-medium">{errors.budget}</p>}
            </div>
          )}

          {/* ── Step 2: Companions ──────────────────────────────────────────── */}
          {step === 2 && (
            <div className="grid grid-cols-2 gap-3 animate-fade-in">
              {COMPANION_OPTIONS.map((opt) => (
                <SelectCard
                  key={opt.id}
                  item={opt}
                  selected={form.companions === opt.id}
                  onSelect={(id) => setForm({ ...form, companions: id })}
                />
              ))}
              {errors.companions && <p className="text-xs text-red-500 mt-1 font-medium col-span-2">{errors.companions}</p>}
            </div>
          )}

          {/* ── Navigation Buttons ──────────────────────────────────────────── */}
          <div className="flex items-center justify-between mt-8 gap-4">
            <button
              id="form-back-btn"
              onClick={handleBack}
              disabled={step === 0}
              className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              ← Back
            </button>

            {step < TOTAL_STEPS - 1 ? (
              <button
                id="form-next-btn"
                onClick={handleNext}
                className="flex-1 py-3.5 rounded-xl text-white font-bold text-sm gradient-brand shadow-md hover:opacity-90 hover:scale-[1.02] transition-all"
              >
                Continue →
              </button>
            ) : (
              <button
                id="form-submit-btn"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-3.5 rounded-xl text-white font-bold text-sm gradient-brand shadow-md hover:opacity-90 hover:scale-[1.02] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Generating your trip...
                  </>
                ) : (
                  "✨ Generate My Trip"
                )}
              </button>
            )}
          </div>
        </div>

        {/* Form summary preview */}
        {(form.destination || form.budget || form.companions) && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 animate-fade-in">
            {form.destination && (
              <span className="text-xs font-semibold px-3 py-1 bg-white border border-indigo-100 text-indigo-700 rounded-full shadow-sm">
                📍 {form.destination}
              </span>
            )}
            {form.duration && (
              <span className="text-xs font-semibold px-3 py-1 bg-white border border-indigo-100 text-indigo-700 rounded-full shadow-sm">
                📅 {form.duration} days
              </span>
            )}
            {form.budget && (
              <span className="text-xs font-semibold px-3 py-1 bg-white border border-purple-100 text-purple-700 rounded-full shadow-sm">
                💰 {form.budget}
              </span>
            )}
            {form.companions && (
              <span className="text-xs font-semibold px-3 py-1 bg-white border border-teal-100 text-teal-700 rounded-full shadow-sm">
                👥 {form.companions}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
