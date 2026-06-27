import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// ─── Mock Itinerary Data ─────────────────────────────────────────────────────

const MOCK_ITINERARY = {
  tripId: "trip-001",
  destination: "Kyoto, Japan",
  duration: 7,
  hotels: [
    {
      _id: "hotel-001",
      name: "The Ritz-Carlton Kyoto",
      location: "Nakagawa-cho, Kamigyo Ward, Kyoto",
      pricePerNight: 850,
      rating: 4.9,
      image:
        "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&auto=format&fit=crop",
      description:
        "Nestled on the banks of the Kamogawa river with iconic views of the Higashiyama mountains.",
    },
    {
      _id: "hotel-002",
      name: "Hyatt Regency Kyoto",
      location: "Sanjusangendo-mawari, Higashiyama Ward",
      pricePerNight: 420,
      rating: 4.7,
      image:
        "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&auto=format&fit=crop",
      description:
        "Contemporary luxury with Japanese sensibilities, moments from Sanjusangendo Temple.",
    },
    {
      _id: "hotel-003",
      name: "Mitsui Garden Hotel Kyoto Sanjo",
      location: "Sanjo Ohashi, Nakagyo Ward",
      pricePerNight: 180,
      rating: 4.5,
      image:
        "https://images.unsplash.com/photo-1586611292717-f828b167408c?w=600&auto=format&fit=crop",
      description:
        "Stylish mid-range property in the heart of central Kyoto, walking distance to Nijo Castle.",
    },
  ],
  days: [
    {
      day: 1,
      title: "Arrival & Gion Discovery",
      slots: {
        Morning: {
          activity: "Fushimi Inari Shrine",
          description:
            "Hike through thousands of vibrant red torii gates at Japan's most iconic Shinto shrine. Arrive early to beat the crowds.",
          timing: "8:00 AM – 11:00 AM",
          image:
            "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400&auto=format&fit=crop",
        },
        Afternoon: {
          activity: "Nishiki Market",
          description:
            "Stroll Kyoto's famous 'Kitchen' market. Sample pickled vegetables, fresh tofu, and street food skewers.",
          timing: "12:30 PM – 3:00 PM",
          image:
            "https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=400&auto=format&fit=crop",
        },
        Evening: {
          activity: "Gion District Evening Walk",
          description:
            "Wander the historic Gion quarter as lanterns glow along cobblestone streets. Spot geiko and maiko if you're lucky.",
          timing: "6:00 PM – 9:00 PM",
          image:
            "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=400&auto=format&fit=crop",
        },
      },
    },
    {
      day: 2,
      title: "Arashiyama & Bamboo Grove",
      slots: {
        Morning: {
          activity: "Arashiyama Bamboo Grove",
          description:
            "Walk through towering bamboo stalks in one of Japan's most photographed landscapes.",
          timing: "7:30 AM – 10:00 AM",
          image:
            "https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=400&auto=format&fit=crop",
        },
        Afternoon: {
          activity: "Tenryu-ji Temple & Garden",
          description:
            "Explore a UNESCO World Heritage Zen garden with stunning pond and mountain backdrop.",
          timing: "10:30 AM – 1:00 PM",
          image:
            "https://images.unsplash.com/photo-1624601573012-efb68931cc3f?w=400&auto=format&fit=crop",
        },
        Evening: {
          activity: "Togetsukyo Bridge Sunset",
          description:
            "Watch the sun dip behind the Arashiyama mountains from the iconic Moon Crossing Bridge.",
          timing: "5:30 PM – 7:00 PM",
          image:
            "https://images.unsplash.com/photo-1553697388-94e804e2f0f6?w=400&auto=format&fit=crop",
        },
      },
    },
    {
      day: 3,
      title: "Imperial Palaces & Zen Gardens",
      slots: {
        Morning: {
          activity: "Nijo Castle",
          description:
            "Explore the UNESCO-listed shogunate palace famous for its nightingale floors that chirp when walked upon.",
          timing: "9:00 AM – 11:30 AM",
          image:
            "https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?w=400&auto=format&fit=crop",
        },
        Afternoon: {
          activity: "Ryoan-ji Rock Garden",
          description:
            "Contemplate Japan's most famous Zen rock garden — 15 stones arranged so that only 14 are visible at once.",
          timing: "1:00 PM – 3:30 PM",
          image:
            "https://images.unsplash.com/photo-1602524814679-a87de8f46e34?w=400&auto=format&fit=crop",
        },
        Evening: {
          activity: "Pontocho Alley Dinner",
          description:
            "Dine along Pontocho's narrow lane, lined with traditional ochaya teahouses and riverside restaurants.",
          timing: "7:00 PM – 9:30 PM",
          image:
            "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=400&auto=format&fit=crop",
        },
      },
    },
  ],
};

// ─── Async Thunks ─────────────────────────────────────────────────────────────

export const fetchItinerary = createAsyncThunk(
  "itinerary/fetchItinerary",
  async (tripId, { rejectWithValue }) => {
    try {
      const res = await axios.get(`/api/v1/itinerary/${tripId}`);
      return res.data.data;
    } catch {
      return { ...MOCK_ITINERARY, tripId };
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
