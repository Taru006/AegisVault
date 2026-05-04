import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice.js";
import fileReducer from "./slices/fileSlice.js";
import uiReducer from "./slices/uiSlice.js";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    files: fileReducer,
    ui: uiReducer,
  },
});
