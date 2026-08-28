import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { emailApi } from "../emails/emailApi";
import { slackApi } from "../slack/slackApi";

// ── Types ──

export interface User {
  userId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// ── Thunks ──

export const fetchCurrentUser = createAsyncThunk<User>(
  "auth/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (!res.ok) return rejectWithValue("Not authenticated");
    const data = await res.json();
    return data.user;
  }
);

export const loginUser = createAsyncThunk<User, any>(
  "auth/loginUser",
  async (credentials, { rejectWithValue }) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    const data = await res.json();
    if (!res.ok) {
      return rejectWithValue(data.error?.message || "Login failed");
    }
    return data.user;
  }
);

export const signupUser = createAsyncThunk<User, any>(
  "auth/signupUser",
  async (userData, { rejectWithValue }) => {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    const data = await res.json();
    if (!res.ok) {
      return rejectWithValue(data.error?.message || "Signup failed");
    }
    return data.user;
  }
);

export const logoutUser = createAsyncThunk(
  "auth/logout",
  async (_, { dispatch }) => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    // Clear all RTK Query API caches on logout to avoid memory leak or session cross-talk
    dispatch(emailApi.util.resetApiState());
    dispatch(slackApi.util.resetApiState());
  }
);

// ── Slice ──

const initialState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isLoading = false;
    },
    clearUser: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.isLoading = false;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.isLoading = false;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.isLoading = false;
      })
      .addCase(signupUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.isLoading = false;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
      });
  },
});

export const { setUser, clearUser } = authSlice.actions;
export default authSlice.reducer;
