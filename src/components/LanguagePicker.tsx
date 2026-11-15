"use client";

import { useEffect, useRef, useState } from "react";

import { setLocale, useLocale, useT } from "@/hooks/useT";
import { LOCALES } from "@/lib/i18n";

/**
 * The globe: picks the language the site reads in. One component for every
 * header, like ThemeToggle beside it. Each language is listed in its own name,
 * so a reader can find theirs whatever the page is in now.
 */
export function LanguagePicker({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const t = useT();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const label = t("Language");
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${className}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18zM3.6 9h16.8M3.6 15h16.8M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={label}
          className="absolute right-0 top-full z-50 mt-2 min-w-[160px] rounded-xl border border-ink-line bg-ink-card py-2 shadow-[0_12px_32px_rgb(0_0_0/0.25)]"
        >
          {LOCALES.map((l) => (
            <li key={l.code} role="option" aria-selected={l.code === locale} lang={l.code}>
              <button
                type="button"
                onClick={() => {
                  setLocale(l.code);
                  setOpen(false);
                }}
                className={`block w-full px-4 py-2 text-left text-[15px] hover:bg-ink-raised ${l.code === locale ? "text-accent" : "text-ink-text"}`}
              >
                {l.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
