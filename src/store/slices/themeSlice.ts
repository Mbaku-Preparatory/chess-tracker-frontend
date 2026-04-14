import { createSlice } from "@reduxjs/toolkit";

type ThemeMode = "light" | "dark";

const STORAGE_KEY = "theme";

interface ThemeState {
  mode: ThemeMode;
}

const initialState: ThemeState = { mode: "light" };

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    loadThemeFromStorage(state) {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(STORAGE_KEY);
        state.mode = stored === "dark" ? "dark" : "light";
      }
    },
    toggleTheme(state) {
      state.mode = state.mode === "light" ? "dark" : "light";
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, state.mode);
      }
    },
  },
});

export const { loadThemeFromStorage, toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;
