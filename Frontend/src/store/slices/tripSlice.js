import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_TRIPS = [
  {
    _id: "trip-001",
    destination: "Kyoto, Japan",
    duration: 7,
    budget: "Luxury",
    companions: "A Couple",
    coverImage:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&auto=format&fit=crop",
    createdAt: "2026-06-01",
  },
  {
    _id: "trip-002",
    destination: "Santorini, Greece",
    duration: 5,
    budget: "Moderate",
    companions: "Friends",
    coverImage:
      "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&auto=format&fit=crop",
    createdAt: "2026-06-10",
  },
  {
    _id: "trip-003",
    destination: "Bali, Indonesia",
    duration: 10,
    budget: "Cheap",
    companions: "Just Me",
    coverImage:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&auto=format&fit=crop",
    createdAt: "2026-06-18",
  },
  {
    _id: "trip-004",
    destination: "New York City, USA",
    duration: 4,
    budget: "Luxury",
    companions: "Family",
    coverImage:
      "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&auto=format&fit=crop",
    createdAt: "2026-06-22",
  },
];

// ─── Async Thunks ────────────────────────────────────────────────────────────

export const fetchTrips = createAsyncThunk(
  "trips/fetchTrips",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get("/api/v1/trips");
      return res.data.data;
    } catch {
      return MOCK_TRIPS;
    }
  }
);

export const fetchTripById = createAsyncThunk(
  "trips/fetchTripById",
  async (tripId, { rejectWithValue }) => {
    try {
      const res = await axios.get(`/api/v1/trips/${tripId}`);
      return res.data.data;
    } catch {
      return MOCK_TRIPS.find((t) => t._id === tripId) || MOCK_TRIPS[0];
    }
  }
);

export const createTrip = createAsyncThunk(
  "trips/createTrip",
  async (tripData, { rejectWithValue }) => {
    try {
      const res = await axios.post("/api/v1/trips", tripData);
      return res.data.data;
    } catch {
      // Return mock new trip
      return {
        _id: `trip-${Date.now()}`,
        ...tripData,
        coverImage:
          "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&auto=format&fit=crop",
        createdAt: new Date().toISOString(),
      };
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
      });
  },
});

export const { setActiveTrip, clearActiveTrip } = tripSlice.actions;
export default tripSlice.reducer;
