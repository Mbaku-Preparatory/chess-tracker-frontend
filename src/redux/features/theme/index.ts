import type { ThemeId } from "@/lib/themes";
import { LOAD_THEME, SET_COLOR_SCHEME, TOGGLE_THEME } from "@/redux/actions/actionTypes";

type ThemeMode = "light" | "dark";
const MODE_KEY = "theme";
const SCHEME_KEY = "color_scheme";
const CUSTOM_COLOR_KEY = "custom_color";

interface ThemeState {
  mode: ThemeMode;
  colorScheme: ThemeId;
  customColor: string | null;
}

const initialState: ThemeState = {
  mode: "light",
  colorScheme: "ocean",
  customColor: null,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const themeReducer = (state = initialState, action: any): ThemeState => {
  switch (action.type) {
    case LOAD_THEME: {
      if (typeof window === "undefined") return state;
      const stored = localStorage.getItem(MODE_KEY);
      const scheme = (localStorage.getItem(SCHEME_KEY) ?? "ocean") as ThemeId;
      const customColor = localStorage.getItem(CUSTOM_COLOR_KEY);
      return {
        mode: stored === "dark" ? "dark" : "light",
        colorScheme: scheme,
        customColor: customColor ?? null,
      };
    }
    case TOGGLE_THEME: {
      const mode: ThemeMode = state.mode === "light" ? "dark" : "light";
      if (typeof window !== "undefined") {
        localStorage.setItem(MODE_KEY, mode);
      }
      return { ...state, mode };
    }
    case SET_COLOR_SCHEME: {
      const { id, customColor } = action.payload as { id: ThemeId; customColor?: string };
      if (typeof window !== "undefined") {
        localStorage.setItem(SCHEME_KEY, id);
        if (customColor) {
          localStorage.setItem(CUSTOM_COLOR_KEY, customColor);
        }
      }
      return {
        ...state,
        colorScheme: id,
        customColor: customColor ?? (id === "custom" ? state.customColor : null),
      };
    }
    default:
      return state;
  }
};

export default themeReducer;
