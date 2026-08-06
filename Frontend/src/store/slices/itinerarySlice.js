import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// ─── Async Thunks ─────────────────────────────────────────────────────────────

export const resolveActivityImage = (title = "", location = "", serverImage = "") => {
  if (serverImage && serverImage.startsWith("http") && !serverImage.includes("photo-1507525428034-b723cf961d3e")) {
    return serverImage;
  }
  const text = `${title} ${location}`.toLowerCase();
  
  if (/castle|fort|palace|heritage|kothi|residency|ruin|arch|citadel/.test(text)) {
    return "https://images.unsplash.com/photo-1578637387939-43c525550085?w=600&auto=format&fit=crop"; // Castle / Heritage
  }
  if (/temple|mandir|ghat|imambara|mosque|tomb|church|cathedral|pagoda|shrine|spiritual/.test(text)) {
    return "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&auto=format&fit=crop"; // Temple Pagoda
  }
  if (/park|garden|sanctuary|forest|vihar|lawn|island|valley|hill|nature|trail|pass|mountain|peak|national park|bamboo/.test(text)) {
    return "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&auto=format&fit=crop"; // Nature / Forest
  }
  if (/water|lake|river|spring|falls|waterfall|beach|sea|coast|bay/.test(text)) {
    return "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600&auto=format&fit=crop"; // Scenic Water
  }
  if (/market|street|mall|bazaar|stroll|road|shop|shopping/.test(text)) {
    return "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=600&auto=format&fit=crop"; // Shopping / Street
  }
  if (/cafe|restaurant|food|dinner|lunch|breakfast|sweet|bakery|dining|ramen|sushi/.test(text)) {
    return "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop"; // Dining / Cafe
  }
  if (/museum|exhibition|gallery|university|college|science|planetarium/.test(text)) {
    return "https://images.unsplash.com/photo-1566121318599-79a0cfdd50af?w=600&auto=format&fit=crop"; // Museum
  }
  if (/zoo|safari|animal|wildlife/.test(text)) {
    return "https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=600&auto=format&fit=crop"; // Wildlife
  }
  return "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&auto=format&fit=crop";
};

const formatItineraryResponse = (itineraries, tripId) => {
  const firstDay = itineraries[0];
  const hotels = (firstDay?.staySuggestion?.options || []).map((opt) => ({
    _id: opt._id || opt.name,
    name: opt.name,
    location: opt.address || opt.distanceFromRoute || "Kyoto",
    pricePerNight: opt.pricePerNight,
    rating: opt.rating || 4.5,
    image: opt.image || (opt.type === "Hostel" 
      ? "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&auto=format&fit=crop"
      : "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&auto=format&fit=crop"),
    description: opt.features?.join(", ") || opt.rationale || "Comfortable stay option.",
  }));

  const days = itineraries.map((dayItin) => {
    const slots = {};
    (dayItin.activities || []).forEach((act) => {
      const image = resolveActivityImage(act.title, act.location, act.image);

      slots[act.timeSlot] = {
        _id: act._id,
        activity: act.title,
        description: act.description,
        rationale: act.rationale || "",
        timing: act.time || "Flexible",
        image,
        cost: act.cost,
        location: act.location,
        status: act.status || "Pending",
        transportDetails: act.transportDetails,
        timeSlot: act.timeSlot,
        estimatedDuration: act.estimatedDuration,
      };
    });

    const activitiesList = (dayItin.activities || []).map((act) => {
      const image = resolveActivityImage(act.title, act.location, act.image);
      return {
        _id: act._id,
        activity: act.title,
        description: act.description,
        rationale: act.rationale || "",
        timing: act.time || "Flexible",
        image,
        cost: act.cost,
        location: act.location,
        status: act.status || "Pending",
        transportDetails: act.transportDetails,
        timeSlot: act.timeSlot || "Morning",
        estimatedDuration: act.estimatedDuration,
      };
    });

    return {
      day: dayItin.dayNumber,
      title: dayItin.summary || `Day ${dayItin.dayNumber}`,
      slots,
      activitiesList,
      foodSuggestions: dayItin.foodSuggestions || [],
      staySuggestion: dayItin.staySuggestion || null,
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
    updateActivityStatusLocal(state, action) {
      const { activityId, status } = action.payload || {};
      if (!state.itinerary || !state.itinerary.days || !activityId) return;

      for (const day of state.itinerary.days) {
        if (day.activitiesList) {
          const act = day.activitiesList.find((a) => a._id === activityId);
          if (act) {
            act.status = status;
          }
        }
        if (day.slots) {
          for (const slotKey of Object.keys(day.slots)) {
            if (day.slots[slotKey] && day.slots[slotKey]._id === activityId) {
              day.slots[slotKey].status = status;
            }
          }
        }
      }
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

export const { clearItinerary, updateActivityStatusLocal } = itinerarySlice.actions;
export default itinerarySlice.reducer;
