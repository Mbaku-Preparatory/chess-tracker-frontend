import type { ThemeMode } from "@/lib/theme";

import { LOAD_THEME, SET_THEME, TOGGLE_THEME } from "./actionTypes";

export const loadThemeFromStorage = () => ({ type: LOAD_THEME });
export const toggleTheme = () => ({ type: TOGGLE_THEME });
/** A choice from the settings page; null follows the device from now on. */
export const setTheme = (mode: ThemeMode | null) => ({ type: SET_THEME, payload: mode });
