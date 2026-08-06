import { configureStore } from "@reduxjs/toolkit";
import chatReducer from "./slices/chatSlice";
import suggestionReducer from "./slices/suggestionSlice";
import authReducer from "./slices/authSlice";
import tripReducer from "./slices/tripSlice";
import itineraryReducer from "./slices/itinerarySlice";

export const store = configureStore({
  reducer: {
    chat: chatReducer,
    suggestions: suggestionReducer,
    auth: authReducer,
    trips: tripReducer,
    itinerary: itineraryReducer,
  },
});
