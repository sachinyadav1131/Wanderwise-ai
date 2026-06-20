import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// Configure base URL if necessary
axios.defaults.baseURL = "http://localhost:5000";
axios.defaults.withCredentials = true;

export const fetchChatHistory = createAsyncThunk(
  "chat/fetchChatHistory",
  async (tripId) => {
    const response = await axios.get(`/api/v1/chat/trip/${tripId}`);
    return response.data.data;
  }
);

export const sendChatMessage = createAsyncThunk(
  "chat/sendChatMessage",
  async ({ tripId, message }) => {
    const response = await axios.post("/api/v1/chat/message", { tripId, message });
    return response.data;
  }
);

const chatSlice = createSlice({
  name: "chat",
  initialState: { history: [], loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchChatHistory.fulfilled, (state, action) => {
        state.history = action.payload;
      })
      .addCase(sendChatMessage.pending, (state) => {
        state.loading = true;
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.loading = false;
        state.history.push(action.payload.userMessage);
        state.history.push(action.payload.aiMessage);
      })
      .addCase(sendChatMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default chatSlice.reducer;
