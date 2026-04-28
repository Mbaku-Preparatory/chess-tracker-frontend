"use client";

import { useEffect } from "react";

import { getThemeVars } from "@/lib/themes";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { loadThemeFromStorage } from "@/redux/actions/theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { mode, colorScheme, customColor } = useAppSelector((s) => s.theme);

  useEffect(() => {
    dispatch(loadThemeFromStorage());
  }, [dispatch]);

  useEffect(() => {
    const html = document.documentElement;
    if (mode === "dark") html.classList.add("dark");
    else html.classList.remove("dark");
  }, [mode]);

  useEffect(() => {
    const vars = getThemeVars(colorScheme, customColor);
    const root = document.documentElement;
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  }, [colorScheme, customColor]);

  return <>{children}</>;
}
