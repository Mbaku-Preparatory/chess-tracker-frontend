import { LOAD_THEME, TOGGLE_THEME } from "./actionTypes";

export const loadThemeFromStorage = () => ({ type: LOAD_THEME });
export const toggleTheme = () => ({ type: TOGGLE_THEME });
