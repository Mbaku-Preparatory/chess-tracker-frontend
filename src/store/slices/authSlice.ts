import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { authStorage } from "@/lib/auth";

interface AuthState {
  token: string | null;
  email: string | null;
  /** True once loadAuthFromStorage has run on the client. */
  initialized: boolean;
}

const initialState: AuthState = {
  token: null,
  email: null,
  initialized: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loadAuthFromStorage(state) {
      state.token = authStorage.getToken();
      state.email = authStorage.getEmail();
      state.initialized = true;
    },
    setAuth(state, action: PayloadAction<{ token: string; email: string }>) {
      state.token = action.payload.token;
      state.email = action.payload.email;
      authStorage.setToken(action.payload.token);
      authStorage.setEmail(action.payload.email);
    },
    clearAuth(state) {
      state.token = null;
      state.email = null;
      authStorage.clear();
    },
  },
});

export const { loadAuthFromStorage, setAuth, clearAuth } = authSlice.actions;
export default authSlice.reducer;
