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
      // Prioritize the server-provided activity image; fallback to categorized professional Unsplash photos for existing trips
      let image = act.image;
      if (!image || image.includes("photo-1507525428034-b723cf961d3e")) {
        image = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&auto=format&fit=crop"; // default travel photo
        const title = (act.title || "").toLowerCase();
        if (title.includes("temple") || title.includes("mandir") || title.includes("ghat") || title.includes("imambara") || title.includes("mosque") || title.includes("tomb") || title.includes("church") || title.includes("cathedral") || title.includes("monument")) {
          image = "https://images.unsplash.com/photo-1604580864964-0462f5d5b1a8?w=400&auto=format&fit=crop"; // Spiritual / Heritage Monument
        } else if (title.includes("fort") || title.includes("palace") || title.includes("castle") || title.includes("heritage") || title.includes("kothi") || title.includes("residency") || title.includes("ruin") || title.includes("arch")) {
          image = "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=400&auto=format&fit=crop"; // Indian Heritage Palace
        } else if (title.includes("zoo") || title.includes("safari") || title.includes("animal") || title.includes("wildlife")) {
          image = "https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=400&auto=format&fit=crop"; // Zoo / Animals
        } else if (title.includes("park") || title.includes("garden") || title.includes("sanctuary") || title.includes("forest") || title.includes("vihar") || title.includes("lawn") || title.includes("island")) {
          image = "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&auto=format&fit=crop"; // Green Park / Garden
        } else if (title.includes("valley") || title.includes("hill") || title.includes("nature") || title.includes("trail") || title.includes("pass") || title.includes("mountain") || title.includes("peak")) {
          image = "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&auto=format&fit=crop"; // Mountain Valleys / Scenery
        } else if (title.includes("market") || title.includes("street") || title.includes("mall") || title.includes("bazaar") || title.includes("stroll") || title.includes("road") || title.includes("shop")) {
          image = "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=400&auto=format&fit=crop"; // Shopping streets
        } else if (title.includes("water") || title.includes("lake") || title.includes("river") || title.includes("spring") || title.includes("falls") || title.includes("waterfall") || title.includes("beach") || title.includes("sea")) {
          image = "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&auto=format&fit=crop"; // Water body
        } else if (title.includes("museum") || title.includes("exhibition") || title.includes("gallery") || title.includes("university") || title.includes("college") || title.includes("science") || title.includes("planetarium")) {
          image = "https://images.unsplash.com/photo-1566121318599-79a0cfdd50af?w=400&auto=format&fit=crop"; // Museum / Science centre
        } else if (title.includes("cafe") || title.includes("restaurant") || title.includes("food") || title.includes("dinner") || title.includes("lunch") || title.includes("breakfast") || title.includes("sweet") || title.includes("bakery")) {
          image = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&auto=format&fit=crop"; // Cafe / Dining
        }
      }

      slots[act.timeSlot] = {
        _id: act._id,
        activity: act.title,
        description: act.description,
        timing: act.time || "Flexible",
        image,
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
