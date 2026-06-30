import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// ─── Async Thunks ─────────────────────────────────────────────────────────────

const formatItineraryResponse = (itineraries, tripId) => {
  const firstDay = itineraries[0];
  const hotels = (firstDay?.staySuggestion?.options || []).map((opt) => ({
    _id: opt._id || opt.name,
    name: opt.name,
    location: opt.address || opt.distanceFromRoute || "Kyoto",
    pricePerNight: opt.pricePerNight,
    rating: opt.rating || 4.5,
    image: opt.type === "Hostel" 
      ? "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&auto=format&fit=crop"
      : "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&auto=format&fit=crop",
    description: opt.features?.join(", ") || opt.rationale || "Comfortable stay option.",
  }));

  const days = itineraries.map((dayItin) => {
    const slots = {};
    (dayItin.activities || []).forEach((act) => {
      slots[act.timeSlot] = {
        _id: act._id,
        activity: act.title,
        description: act.description,
        timing: act.time || "Flexible",
        image: undefined, // Let it fall back to default unsplash
        cost: act.cost,
        location: act.location,
        transportDetails: act.transportDetails,
      };
    });

    return {
      day: dayItin.dayNumber,
      title: dayItin.summary || `Day ${dayItin.dayNumber}`,
      slots,
    };
  });

  return {
    tripId,
    destination: firstDay?.trip?.destination || "Destination",
    hotels,
    days,
  };
};

export const fetchItinerary = createAsyncThunk(
  "itinerary/fetchItinerary",
  async (tripId, { rejectWithValue }) => {
    try {
      const res = await axios.get(`/api/v1/itineraries/trip/${tripId}`);
      const itineraries = res.data.data;

      // Self-healing check: if database has no itineraries generated yet, trigger AI generator
      if (!itineraries || itineraries.length === 0) {
        await axios.post(`/api/v1/itineraries/generate/${tripId}`);
        const refetch = await axios.get(`/api/v1/itineraries/trip/${tripId}`);
        return formatItineraryResponse(refetch.data.data, tripId);
      }

      return formatItineraryResponse(itineraries, tripId);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const itinerarySlice = createSlice({
  name: "itinerary",
  initialState: {
    itinerary: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearItinerary(state) {
      state.itinerary = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchItinerary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchItinerary.fulfilled, (state, action) => {
        state.loading = false;
        state.itinerary = action.payload;
      })
      .addCase(fetchItinerary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export const { clearItinerary } = itinerarySlice.actions;
export default itinerarySlice.reducer;
