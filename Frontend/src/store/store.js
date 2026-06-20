import { configureStore } from "@reduxjs/toolkit";
import chatReducer from "./slices/chatSlice";
import suggestionReducer from "./slices/suggestionSlice";

export const store = configureStore({
  reducer: {
    chat: chatReducer,
    suggestions: suggestionReducer,
  },
});
