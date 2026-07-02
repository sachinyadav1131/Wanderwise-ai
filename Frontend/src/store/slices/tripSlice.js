import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// ─── Async Thunks ────────────────────────────────────────────────────────────
const formatTripData = (trip) => {
  if (!trip) return null;
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  // Calculate duration in days (difference in days + 1, e.g. July 2 to July 5 is 4 days)
  const duration = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1 || 1;

  let budget = "Moderate";
  if (trip.totalBudget) {
    const daily = trip.totalBudget / duration;
    if (daily < 2500) budget = "Cheap";
    else if (daily >= 2500 && daily < 8000) budget = "Moderate";
    else budget = "Luxury";
  }

  let companions = "Just Me";
  if (trip.travelers === 2) companions = "A Couple";
  else if (trip.travelers === 3 || trip.travelers === 4) companions = "Friends";
  else if (trip.travelers > 4) companions = "Family";

  // Map nice cover images based on destination keywords (only if trip has no database-saved cover image)
  let coverImage = trip.coverImage || "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&auto=format&fit=crop";
  if (!trip.coverImage) {
    const dest = (trip.destination || "").toLowerCase();
    if (dest.includes("kyoto") || dest.includes("japan") || dest.includes("tokyo")) {
      coverImage = "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&auto=format&fit=crop";
    } else if (dest.includes("santorini") || dest.includes("greece")) {
      coverImage = "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&auto=format&fit=crop";
    } else if (dest.includes("bali") || dest.includes("indonesia")) {
      coverImage = "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&auto=format&fit=crop";
    } else if (dest.includes("new york") || dest.includes("nyc") || dest.includes("usa")) {
      coverImage = "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&auto=format&fit=crop";
    }
  }

  return {
    ...trip,
    duration,
    budget,
    companions,
    coverImage,
  };
};

export const fetchTrips = createAsyncThunk(
  "trips/fetchTrips",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get("/api/v1/trips");
      return (res.data.data || []).map(formatTripData);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchTripById = createAsyncThunk(
  "trips/fetchTripById",
  async (tripId, { rejectWithValue }) => {
    try {
      const res = await axios.get(`/api/v1/trips/${tripId}`);
      return formatTripData(res.data.data);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const createTrip = createAsyncThunk(
  "trips/createTrip",
  async (tripData, { rejectWithValue }) => {
    try {
      const res = await axios.post("/api/v1/trips", tripData);
      return formatTripData(res.data.data);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateTripStatus = createAsyncThunk(
  "trips/updateTripStatus",
  async ({ tripId, status }, { rejectWithValue }) => {
    try {
      const res = await axios.put(`/api/v1/trips/${tripId}`, { status });
      return formatTripData(res.data.data);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const deleteTrip = createAsyncThunk(
  "trips/deleteTrip",
  async (tripId, { rejectWithValue }) => {
    try {
      const res = await axios.delete(`/api/v1/trips/${tripId}`);
      return res.data.data; // returns the deleted tripId
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// ─── Slice ───────────────────────────────────────────────────────────────────

const tripSlice = createSlice({
  name: "trips",
  initialState: {
    trips: [],
    activeTrip: null,
    loading: false,
    error: null,
  },
  reducers: {
    setActiveTrip(state, action) {
      state.activeTrip = action.payload;
    },
    clearActiveTrip(state) {
      state.activeTrip = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchTrips
      .addCase(fetchTrips.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTrips.fulfilled, (state, action) => {
        state.loading = false;
        state.trips = action.payload;
      })
      .addCase(fetchTrips.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // fetchTripById
      .addCase(fetchTripById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTripById.fulfilled, (state, action) => {
        state.loading = false;
        state.activeTrip = action.payload;
      })
      .addCase(fetchTripById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // createTrip
      .addCase(createTrip.pending, (state) => {
        state.loading = true;
      })
      .addCase(createTrip.fulfilled, (state, action) => {
        state.loading = false;
        state.trips.unshift(action.payload);
        state.activeTrip = action.payload;
      })
      .addCase(createTrip.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // updateTripStatus
      .addCase(updateTripStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateTripStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.activeTrip = action.payload;
        // update item inside trips list
        const idx = state.trips.findIndex((t) => t._id === action.payload._id);
        if (idx !== -1) {
          state.trips[idx] = action.payload;
        }
      })
      .addCase(updateTripStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // deleteTrip
      .addCase(deleteTrip.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteTrip.fulfilled, (state, action) => {
        state.loading = false;
        const deletedId = action.payload;
        state.trips = state.trips.filter((t) => t._id !== deletedId);
        if (state.activeTrip?._id === deletedId) {
          state.activeTrip = null;
        }
      })
      .addCase(deleteTrip.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export const { setActiveTrip, clearActiveTrip } = tripSlice.actions;
export default tripSlice.reducer;
