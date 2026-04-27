import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { authStorage } from "@/lib/auth";

interface AuthState {
  token: string | null;
  email: string | null;
  profilePic: string | null;
  /** True once loadAuthFromStorage has run on the client. */
  initialized: boolean;
}

const initialState: AuthState = {
  token: null,
  email: null,
  profilePic: null,
  initialized: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loadAuthFromStorage(state) {
      state.token = authStorage.getToken();
      state.email = authStorage.getEmail();
      state.profilePic = authStorage.getProfilePic();
      state.initialized = true;
    },
    setAuth(state, action: PayloadAction<{ token: string; email: string }>) {
      state.token = action.payload.token;
      state.email = action.payload.email;
      state.initialized = true;
      authStorage.setToken(action.payload.token);
      authStorage.setEmail(action.payload.email);
    },
    setProfilePic(state, action: PayloadAction<string>) {
      state.profilePic = action.payload;
      authStorage.setProfilePic(action.payload);
    },
    clearAuth(state) {
      state.token = null;
      state.email = null;
      state.profilePic = null;
      authStorage.clear();
    },
  },
});

export const { loadAuthFromStorage, setAuth, setProfilePic, clearAuth } = authSlice.actions;
export default authSlice.reducer;
