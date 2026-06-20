import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

export const approveSuggestion = createAsyncThunk(
  "suggestions/approveSuggestion",
  async (suggestionId) => {
    const response = await axios.post(`/api/v1/suggestions/${suggestionId}/approve`);
    return { suggestionId, data: response.data };
  }
);

export const rejectSuggestion = createAsyncThunk(
  "suggestions/rejectSuggestion",
  async (suggestionId) => {
    const response = await axios.post(`/api/v1/suggestions/${suggestionId}/reject`);
    return { suggestionId, data: response.data };
  }
);

const suggestionSlice = createSlice({
  name: "suggestions",
  initialState: { activeSuggestion: null, loading: false, error: null },
  reducers: {
    setActiveSuggestion: (state, action) => {
      state.activeSuggestion = action.payload;
    },
    clearActiveSuggestion: (state) => {
      state.activeSuggestion = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(approveSuggestion.pending, (state) => {
        state.loading = true;
      })
      .addCase(approveSuggestion.fulfilled, (state) => {
        state.loading = false;
        state.activeSuggestion = null;
      })
      .addCase(approveSuggestion.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(rejectSuggestion.fulfilled, (state) => {
        state.activeSuggestion = null;
      });
  },
});

export const { setActiveSuggestion, clearActiveSuggestion } = suggestionSlice.actions;
export default suggestionSlice.reducer;
