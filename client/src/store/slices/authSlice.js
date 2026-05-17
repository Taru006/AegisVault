import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api.js";

// ── Thunks ──────────────────────────────────
export const registerUser = createAsyncThunk(
  "auth/register",
  async (userData, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/auth/register", userData);
      // We don't set token here because user needs to verify MFA first?
      // Actually backend says: "User registered. Scan QR code... then call POST /api/auth/verify-mfa to enable MFA."
      // So we stay on registration page to show QR.
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Registration failed"
      );
    }
  }
);

export const login = createAsyncThunk(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/auth/login", credentials);
      if (!data.mfaRequired) {
        localStorage.setItem("token", data.accessToken);
      }
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Login failed"
      );
    }
  }
);

export const verifyMfa = createAsyncThunk(
  "auth/verifyMfa",
  async (mfaData, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/auth/verify-mfa", mfaData);
      localStorage.setItem("token", data.accessToken);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "MFA verification failed"
      );
    }
  }
);

export const loadUser = createAsyncThunk(
  "auth/loadUser",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/auth/me");
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Session expired"
      );
    }
  }
);

// ── Slice ───────────────────────────────────
const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    token: localStorage.getItem("token") || null,
    role: null,
    loading: false,
    error: null,
    mfaRequired: false,
    mfaSetup: null, // For registration QR code
  },
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.role = null;
      state.error = null;
      localStorage.removeItem("token");
    },
    clearError(state) {
      state.error = null;
    },
    resetMfaState(state) {
      state.mfaRequired = false;
      state.mfaSetup = null;
    }
  },
  extraReducers: (builder) => {
    // Register
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.mfaSetup = action.payload.mfa; // Store QR code URL and secret
        // Note: we don't set token/user yet as they need to verify MFA
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Login
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.mfaRequired) {
          state.mfaRequired = true;
        } else {
          state.user = action.payload.user;
          state.token = action.payload.accessToken;
          state.role = action.payload.user?.role || null;
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Verify MFA
    builder
      .addCase(verifyMfa.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyMfa.fulfilled, (state, action) => {
        state.loading = false;
        state.mfaRequired = false;
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
        state.role = action.payload.user?.role || null;
      })
      .addCase(verifyMfa.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Load User
    builder
      .addCase(loadUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.role = action.payload.user?.role || null;
      })
      .addCase(loadUser.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.role = null;
        localStorage.removeItem("token");
      });
  },
});

export const { logout, clearError, resetMfaState } = authSlice.actions;
export default authSlice.reducer;
