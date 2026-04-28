"use client";

import { useRef } from "react";

import { THEMES, type ThemeId } from "@/lib/themes";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setColorScheme } from "@/redux/actions/theme";

export function ThemePicker() {
  const dispatch = useAppDispatch();
  const { colorScheme, customColor } = useAppSelector((s) => s.theme);
  const colorInputRef = useRef<HTMLInputElement>(null);

  function handlePreset(id: ThemeId) {
    dispatch(setColorScheme({ id }));
  }

  function handleCustomColor(hex: string) {
    dispatch(setColorScheme({ id: "custom", customColor: hex }));
  }

  const activePreview =
    colorScheme === "custom" && customColor
      ? customColor
      : (THEMES.find((t) => t.id === colorScheme)?.preview ?? THEMES[0].preview);

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-gray-400 dark:text-gray-500">
        Colour
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {THEMES.map((theme) => {
          const isActive = colorScheme === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => handlePreset(theme.id)}
              title={theme.name}
              className="relative h-7 w-7 rounded-full transition-transform hover:scale-110 focus:outline-none"
              style={{ backgroundColor: theme.preview }}
            >
              {isActive && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <svg
                    className="h-4 w-4 text-white drop-shadow"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}

        {/* Custom colour picker */}
        <button
          onClick={() => colorInputRef.current?.click()}
          title="Custom colour"
          className={`relative h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none ${
            colorScheme === "custom"
              ? "border-gray-400 dark:border-gray-300"
              : "border-dashed border-gray-300 dark:border-gray-600"
          }`}
          style={
            colorScheme === "custom" && customColor
              ? { backgroundColor: customColor }
              : { background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" }
          }
        >
          {colorScheme === "custom" && (
            <span className="absolute inset-0 flex items-center justify-center">
              <svg
                className="h-4 w-4 text-white drop-shadow"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          )}
        </button>

        <input
          ref={colorInputRef}
          type="color"
          value={customColor ?? activePreview}
          onChange={(e) => handleCustomColor(e.target.value)}
          className="sr-only"
          aria-label="Pick a custom colour"
        />
      </div>
    </div>
  );
}
