"use client";

import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { loadThemeFromStorage } from "@/redux/actions/theme";

/**
 * Applies the light/dark mode to <html>.
 *
 * It used to also write the --brand-* custom properties at runtime, for a
 * six-scheme colour picker. That is gone; the palette lives in globals.css as
 * ordinary CSS defaults, which is one source of truth instead of a stylesheet
 * and a reducer racing to set the same variables.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const mode = useAppSelector((s) => s.theme.mode);

  useEffect(() => {
    dispatch(loadThemeFromStorage());
  }, [dispatch]);

  useEffect(() => {
    const html = document.documentElement;
    if (mode === "dark") html.classList.add("dark");
    else html.classList.remove("dark");
  }, [mode]);

  return <>{children}</>;
}
