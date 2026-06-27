import { createSlice } from "@reduxjs/toolkit";

// ─── Slice ────────────────────────────────────────────────────────────────────
// Tracks which activity IDs have been checked off as complete.
// State shape: { completedActivities: { [activityId]: boolean } }

const activitySlice = createSlice({
  name: "activity",
  initialState: {
    completedActivities: {},
  },
  reducers: {
    toggleActivity(state, action) {
      const id = action.payload;
      state.completedActivities[id] = !state.completedActivities[id];
    },
    markComplete(state, action) {
      state.completedActivities[action.payload] = true;
    },
    markIncomplete(state, action) {
      state.completedActivities[action.payload] = false;
    },
    clearAllActivities(state) {
      state.completedActivities = {};
    },
  },
});

export const {
  toggleActivity,
  markComplete,
  markIncomplete,
  clearAllActivities,
} = activitySlice.actions;

export default activitySlice.reducer;
