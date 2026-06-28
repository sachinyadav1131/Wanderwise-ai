import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { toast } from "react-toastify";

// Helper to configure credentials (send cookies automatically)
axios.defaults.withCredentials = true;

// ─── Async Thunks ───────────────────────────────────────────────────────────

// Register a new user (sends verification OTP email)
export const registerUser = createAsyncThunk(
  "auth/registerUser",
  async ({ name, email, password }, { rejectWithValue }) => {
    try {
      const res = await axios.post("/api/v1/auth/register", { name, email, password });
      toast.success(res.data.message || "Verification OTP sent!");
      return res.data;
    } catch (error) {
      const errMsg = error.response?.data?.message || "Registration failed. Please try again.";
      toast.error(errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// Verify OTP to activate account
export const verifyOtp = createAsyncThunk(
  "auth/verifyOtp",
  async ({ email, otp }, { rejectWithValue }) => {
    try {
      const res = await axios.post("/api/v1/auth/verify-otp", { email, otp });
      toast.success("Account verified successfully!");
      return res.data.user;
    } catch (error) {
      const errMsg = error.response?.data?.message || "OTP verification failed.";
      toast.error(errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// Log in an existing user
export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const res = await axios.post("/api/v1/auth/login", { email, password });
      toast.success("Login successfully");
      return res.data.user;
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message || "Network Error: Cannot connect to backend server.";
      toast.error(errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// Load current user profile (session restoration on refresh)
export const loadCurrentUser = createAsyncThunk(
  "auth/loadCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get("/api/v1/auth/me");
      return res.data.user;
    } catch (error) {
      return rejectWithValue(null);
    }
  }
);

// Log out user
export const logoutUser = createAsyncThunk(
  "auth/logoutUser",
  async (_, { rejectWithValue }) => {
    try {
      await axios.get("/api/v1/auth/logout");
      toast.success("Logged out successfully.");
    } catch (error) {
      console.error("Logout failed on server, clearing client state.");
      toast.success("Logged out successfully.");
    }
    return null;
  }
);

// Trigger password reset instructions email
export const forgotPassword = createAsyncThunk(
  "auth/forgotPassword",
  async ({ email }, { rejectWithValue }) => {
    try {
      const res = await axios.post("/api/v1/auth/password/forgot", { email });
      toast.success(res.data.message || "Reset link sent!");
      return res.data.message;
    } catch (error) {
      const errMsg = error.response?.data?.message || "Failed to request password reset link.";
      toast.error(errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// Submit new password using reset token
export const resetPassword = createAsyncThunk(
  "auth/resetPassword",
  async ({ token, password, confirmPassword }, { rejectWithValue }) => {
    try {
      const res = await axios.put(`/api/v1/auth/password/reset/${token}`, {
        password,
        confirmPassword,
      });
      toast.success("Password reset successfully!");
      return res.data.user;
    } catch (error) {
      const errMsg = error.response?.data?.message || "Failed to reset password.";
      toast.error(errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// Update authenticated user password
export const updatePassword = createAsyncThunk(
  "auth/updatePassword",
  async ({ currentPassword, newPassword, confirmNewPassword }, { rejectWithValue }) => {
    try {
      const res = await axios.put("/api/v1/auth/password/update", {
        currentPassword,
        newPassword,
        confirmNewPassword,
      });
      toast.success("Password updated successfully.");
      return res.data.message;
    } catch (error) {
      const errMsg = error.response?.data?.message || "Failed to update password.";
      toast.error(errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// ─── Slice ──────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
    successMessage: null,
  },
  reducers: {
    clearAuthErrors(state) {
      state.error = null;
      state.successMessage = null;
    },
    setUser(state, action) {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Register
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload.message;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Verify OTP
      .addCase(verifyOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.successMessage = "Account verified successfully!";
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      // Load Current User
      .addCase(loadCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(loadCurrentUser.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
      })
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
        state.successMessage = null;
      })
      // Forgot Password
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Reset Password
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.successMessage = "Password reset successfully!";
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Password
      .addCase(updatePassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePassword.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload;
      })
      .addCase(updatePassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearAuthErrors, setUser } = authSlice.actions;
export default authSlice.reducer;