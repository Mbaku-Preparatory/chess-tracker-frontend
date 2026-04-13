"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  addOpening,
  completeOnboarding,
  removeOpening,
  type RepertoireOpening,
  type RepertoireSection,
} from "@/store/slices/repertoireSlice";
import type { OpeningResult } from "@/types";

const SECTIONS: { key: RepertoireSection; label: string; hint: string }[] = [
  {
    key: "white",
    label: "As White",
    hint: "Your preferred openings with the white pieces",
  },
  {
    key: "black",
    label: "As Black",
    hint: "Your preferred openings with the black pieces",
  },
];

function OpeningChip({
  opening,
  onRemove,
}: {
  opening: RepertoireOpening;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
      <span className="font-mono text-xs text-brand-500">{opening.eco_code}</span>
      <span className="max-w-[180px] truncate">{opening.name}</span>
      <button
        onClick={onRemove}
        className="ml-1 flex-shrink-0 rounded-full p-0.5 text-brand-400 hover:bg-brand-100 hover:text-brand-700 focus:outline-none"
        aria-label={`Remove ${opening.name}`}
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </span>
  );
}

function OpeningSearchSection({
  section,
  label,
  hint,
  selected,
}: {
  section: RepertoireSection;
  label: string;
  hint: string;
  selected: RepertoireOpening[];
}) {
  const dispatch = useAppDispatch();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OpeningResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api.searchOpenings(q, 15);
      setResults(data);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const handleSelect = (result: OpeningResult) => {
    dispatch(addOpening({ section, opening: result as RepertoireOpening }));
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const handleRemove = (slug: string) => {
    dispatch(removeOpening({ section, slug }));
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isSelected = (slug: string) => selected.some((o) => o.slug === slug);

  return (
    <div className="card p-5">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-gray-900">{label}</h3>
        <p className="text-sm text-gray-500">{hint}</p>
      </div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {selected.map((o) => (
            <OpeningChip
              key={o.slug}
              opening={o}
              onRemove={() => handleRemove(o.slug)}
            />
          ))}
        </div>
      )}

      {/* Cap hint */}
      {selected.length >= 5 && (
        <p className="mb-3 text-xs text-amber-600">
          Keep it focused — 2–3 main openings per colour gives the best prep quality.
        </p>
      )}

      {/* Search input — always visible */}
      <div ref={containerRef} className="relative">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            {loading ? (
              <svg
                className="h-4 w-4 animate-spin text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <svg
                className="h-4 w-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            )}
          </div>
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder={`Search openings — e.g. "Caro-Kann" or "Sicilian"`}
            className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* Results dropdown */}
        {open && results.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
            {results.map((result) => {
              const alreadyPicked = isSelected(result.slug);
              return (
                <li key={result.slug}>
                  <button
                    onClick={() => !alreadyPicked && handleSelect(result)}
                    disabled={alreadyPicked}
                    className={`flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors ${
                      alreadyPicked
                        ? "cursor-default bg-gray-50 text-gray-400"
                        : "hover:bg-brand-50"
                    }`}
                  >
                    <span className="mt-0.5 shrink-0 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600">
                      {result.eco_code}
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-medium text-gray-900">
                        {result.name}
                      </span>
                      {result.pgn && (
                        <span className="block truncate text-xs text-gray-400">
                          {result.pgn}
                        </span>
                      )}
                    </span>
                    {alreadyPicked && (
                      <span className="ml-auto shrink-0 text-xs text-brand-500">
                        Selected
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {open && !loading && results.length === 0 && query.length >= 2 && (
          <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 shadow-lg">
            No openings found for &ldquo;{query}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}

export default function SetupPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { white, black } = useAppSelector((s) => s.repertoire);

  const totalSelected = white.length + black.length;
  const isEditing = useAppSelector((s) => s.repertoire.onboardingComplete);

  const handleContinue = () => {
    dispatch(completeOnboarding());
    if (isEditing) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  return (
    <div className="mx-auto max-w-2xl py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mb-4 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-xl font-bold text-white">
            MP
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Build your repertoire
        </h1>
        <p className="mt-2 text-base text-gray-500">
          Pick 2–3 main openings per colour. This personalises your scouting reports.
        </p>
      </div>

      {/* Selection counter */}
      <div className="mb-6 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
        {totalSelected === 0
          ? "Select at least one opening to continue"
          : `${totalSelected} opening${totalSelected !== 1 ? "s" : ""} selected`}
      </div>

      {/* Sections */}
      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map(({ key, label, hint }) => (
          <OpeningSearchSection
            key={key}
            section={key}
            label={label}
            hint={hint}
            selected={key === "white" ? white : black}
          />
        ))}
      </div>

      {/* Continue */}
      <div className="mt-8">
        <button
          onClick={handleContinue}
          disabled={totalSelected === 0}
          className={`w-full rounded-xl px-6 py-3.5 text-base font-semibold transition-all ${
            totalSelected > 0
              ? "btn-primary shadow-md hover:shadow-lg"
              : "cursor-not-allowed bg-gray-100 text-gray-400"
          }`}
        >
          {totalSelected > 0
            ? isEditing
              ? "Save repertoire"
              : "Continue to Mbaku Preparatory"
            : "Select at least one opening"}
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-gray-400">
        You can update your repertoire anytime from the navigation menu.
      </p>
    </div>
  );
}
