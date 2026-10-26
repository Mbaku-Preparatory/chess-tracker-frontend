import { LOAD_THEME, TOGGLE_THEME } from "@/redux/actions/actionTypes";
import { THEME_KEY, initialThemeMode, type ThemeMode } from "@/lib/theme";

interface ThemeState {
  mode: ThemeMode;
  // False until the saved choice has been read. Until then `mode` is only the
  // server's guess, and ThemeProvider must not apply it over the class the
  // head script already set — that is a flash of the wrong theme.
  loaded: boolean;
}

const initialState: ThemeState = { mode: "light", loaded: false };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const themeReducer = (state = initialState, action: any): ThemeState => {
  switch (action.type) {
    case LOAD_THEME: {
      if (typeof window === "undefined") return state;
      return { mode: initialThemeMode(), loaded: true };
    }
    case TOGGLE_THEME: {
      const mode: ThemeMode = state.mode === "light" ? "dark" : "light";
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(THEME_KEY, mode);
        } catch {
          // Private mode or blocked storage: the switch still works for this visit.
        }
      }
      return { mode, loaded: true };
    }
    default:
      return state;
  }
};

export default themeReducer;
