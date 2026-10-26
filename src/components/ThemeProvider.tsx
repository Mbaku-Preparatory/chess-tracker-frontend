"use client";

import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { loadThemeFromStorage } from "@/redux/actions/theme";

/**
 * Keeps the `dark` class on <html> in step with the theme state.
 *
 * The first paint is the head script's job (lib/theme.ts); this takes over
 * once the saved choice has loaded, and from then on follows the switch.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { mode, loaded } = useAppSelector((s) => s.theme);

  useEffect(() => {
    dispatch(loadThemeFromStorage());
  }, [dispatch]);

  useEffect(() => {
    if (!loaded) return;
    document.documentElement.classList.toggle("dark", mode === "dark");
  }, [mode, loaded]);

  return <>{children}</>;
}
