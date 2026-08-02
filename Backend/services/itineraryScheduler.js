const toMinutes = (value) => {
  if (typeof value === "number") return value;
  const [hours, minutes = "0"] = String(value || "08:00").split(":");
  return Number(hours) * 60 + Number(minutes);
};

const toDisplayTime = (minutes) => {
  const normalized = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(((hour + 11) % 12) + 1).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
};

const dayName = (date) => new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(date);

// The default is deliberately deterministic. Replace this adapter with Google Maps,
// Mapbox, or a transit provider in production without changing the scheduler.
export const estimateTravel = (from, to, mode = "Cab") => {
  if (!from) return { minutes: 0, distanceKm: 0, mode: "None" };
  const dx = (from.lat || 0) - (to.lat || 0);
  const dy = (from.lng || 0) - (to.lng || 0);
  const distanceKm = Math.max(0.4, Math.sqrt(dx * dx + dy * dy) * 111);
  const speed = mode === "Walking" ? 4.5 : mode === "Metro" ? 24 : 20;
  return { minutes: Math.max(6, Math.ceil((distanceKm / speed) * 60) + 5), distanceKm: Number(distanceKm.toFixed(1)), mode };
};

const normalise = (place) => ({
  ...place,
  duration: place.duration || Math.ceil(((place.durationRange?.min || 60) + (place.durationRange?.max || 60)) / 2),
  windows: (place.windows?.length ? place.windows : [{ start: "08:00", end: "20:00" }]).map((window) => ({ ...window, start: toMinutes(window.start), end: toMinutes(window.end) })),
});

const placementFor = ({ place, cursor, date, previous, mode, travelEstimator }) => {
  if ((place.closedDays || []).includes(dayName(date))) return null;
  const transit = travelEstimator(previous, place.coordinates, mode);
  const arrival = cursor + transit.minutes;
  const fixedStart = place.fixedStart ? toMinutes(place.fixedStart) : null;
  for (const window of place.windows) {
    const start = fixedStart ?? Math.max(arrival, window.start);
    if (start < window.start || start + place.duration > window.end || (fixedStart !== null && start < arrival)) continue;
    return { start, end: start + place.duration, transit };
  }
  return null;
};

/**
 * Schedules an arbitrary attraction list. It never balances places by day: each
 * day receives only the stops that fit its real time, opening, and transit limits.
 */
export const buildDynamicSchedule = ({ dates, places, startTime = "08:00", softEndTime = "20:00", travelMode = "Cab", travelEstimator = estimateTravel }) => {
  const remaining = places.map(normalise);
  const days = [];
  const dayStart = toMinutes(startTime);
  const softEnd = toMinutes(softEndTime);

  for (let index = 0; index < dates.length; index += 1) {
    const date = new Date(dates[index]);
    let cursor = dayStart;
    let previous = null;
    const activities = [];

    while (remaining.length) {
      const choices = remaining
        .map((place, itemIndex) => ({ place, itemIndex, placement: placementFor({ place, cursor, date, previous, mode: travelMode, travelEstimator }) }))
        .filter(({ placement }) => placement && placement.end <= softEnd)
        .sort((a, b) => {
          const aPriority = a.place.fixedStart ? 0 : a.place.preferred ? 1 : 2;
          const bPriority = b.place.fixedStart ? 0 : b.place.preferred ? 1 : 2;
          // Fixed user requests win. Other preferred windows are honoured, but
          // should not leave a morning empty when a long attraction fits there.
          if (a.place.fixedStart || b.place.fixedStart) return aPriority - bPriority || a.placement.start - b.placement.start;
          return a.placement.start - b.placement.start || aPriority - bPriority || a.placement.transit.minutes - b.placement.transit.minutes;
        });
      const selected = choices[0];
      if (!selected) break;
      remaining.splice(selected.itemIndex, 1);
      activities.push({ ...selected.place, ...selected.placement });
      cursor = selected.placement.end;
      previous = selected.place.coordinates;
    }
    days.push({ dayNumber: index + 1, date, activities });
  }
  return { days, unscheduled: remaining };
};

export { toDisplayTime };
