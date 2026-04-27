import { LOAD_THEME, TOGGLE_THEME } from "@/redux/actions/actionTypes";

type ThemeMode = "light" | "dark";
const STORAGE_KEY = "theme";

interface ThemeState {
  mode: ThemeMode;
}

const initialState: ThemeState = { mode: "light" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const themeReducer = (state = initialState, action: any): ThemeState => {
  switch (action.type) {
    case LOAD_THEME: {
      if (typeof window === "undefined") return state;
      const stored = localStorage.getItem(STORAGE_KEY);
      return { mode: stored === "dark" ? "dark" : "light" };
    }
    case TOGGLE_THEME: {
      const mode: ThemeMode = state.mode === "light" ? "dark" : "light";
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, mode);
      }
      return { mode };
    }
    default:
      return state;
  }
};

export default themeReducer;
