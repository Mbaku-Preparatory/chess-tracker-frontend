/**
 * Light or dark, for every page: the public site, the auth pages and the app
 * share one choice. A visitor who has never chosen gets their device's
 * setting; once they flip the switch, their choice wins everywhere.
 */

export type ThemeMode = "light" | "dark";

export const THEME_KEY = "theme";

export function initialThemeMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    // Storage blocked: fall through to the device setting.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * The same decision as initialThemeMode, inlined into <head> so the class is
 * on <html> before the first paint. React runs too late for that: the page
 * would render in one theme and flick to the other. Kept as a string because
 * it runs before any bundle loads; keep the two in step.
 */
export const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem(${JSON.stringify(THEME_KEY)});var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;
