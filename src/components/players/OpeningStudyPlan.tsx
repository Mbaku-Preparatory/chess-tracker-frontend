"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { OpeningExplorer } from "@/components/players/OpeningExplorer";
import type { OpeningStudySuggestion } from "@/types";

// ── ECO family colour map ─────────────────────────────────────────────────────

const ECO_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-700/50" },
  B: { bg: "bg-violet-100 dark:bg-violet-900/30", text: "text-violet-700 dark:text-violet-400", border: "border-violet-200 dark:border-violet-700/50" },
  C: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", border: "border-amber-200 dark:border-amber-700/50" },
  D: { bg: "bg-sky-100 dark:bg-sky-900/30", text: "text-sky-700 dark:text-sky-400", border: "border-sky-200 dark:border-sky-700/50" },
  E: { bg: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-700 dark:text-rose-400", border: "border-rose-200 dark:border-rose-700/50" },
};

function ecoColors(eco: string) {
  const letter = eco.charAt(0).toUpperCase();
  return ECO_COLORS[letter] ?? { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-400", border: "border-gray-200 dark:border-gray-700" };
}

// ── Score helpers ─────────────────────────────────────────────────────────────

type ScoreTier = "low" | "mid" | "high";

function scoreTier(score: number): ScoreTier {
  if (score < 40) return "low";
  if (score <= 55) return "mid";
  return "high";
}

const SCORE_BAR_COLOR: Record<ScoreTier, string> = {
  low: "bg-red-500",
  mid: "bg-amber-500",
  high: "bg-emerald-500",
};

const PRIORITY_BADGE: Record<ScoreTier, { label: string; cls: string }> = {
  low: { label: "Focus", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  mid: { label: "Improve", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  high: { label: "Solid", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
};

// ── Tab type ──────────────────────────────────────────────────────────────────

type ColorTab = "all" | "white" | "black";

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex animate-pulse items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 dark:border-dark-border dark:bg-dark-elevated">
      <div className="h-7 w-10 shrink-0 rounded-md bg-gray-200 dark:bg-gray-700" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-2.5 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="h-5 w-16 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />
    </div>
  );
}

// ── Single suggestion row ─────────────────────────────────────────────────────

function SuggestionRow({
  item,
  isExplorerOpen,
  onToggleExplorer,
}: {
  item: OpeningStudySuggestion;
  isExplorerOpen: boolean;
  onToggleExplorer: () => void;
}) {
  const colors = ecoColors(item.eco_code);
  const tier = scoreTier(item.score_percent);
  const badge = PRIORITY_BADGE[tier];
  const barColor = SCORE_BAR_COLOR[tier];

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 ${
      isExplorerOpen
        ? "rounded-t-lg border border-b-0 border-brand-200/60 bg-white dark:border-brand-800/40 dark:bg-dark-surface"
        : "rounded-lg border border-gray-100 bg-white dark:border-dark-border dark:bg-dark-surface"
    }`}>
      {/* ECO badge */}
      <span
        className={`inline-flex h-7 w-10 shrink-0 items-center justify-center rounded-md border text-xs font-bold ${colors.bg} ${colors.text} ${colors.border}`}
        title={item.eco_code}
      >
        {item.eco_code}
      </span>

      {/* Name + score bar */}
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-sm font-medium text-gray-800 dark:text-gray-200"
          title={item.opening_name}
        >
          {item.opening_name}
        </p>
        <div className="mt-1 flex items-center gap-2">
          {/* Color indicator */}
          <span className="flex shrink-0 items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <span
              className={`h-2.5 w-2.5 rounded-full border ${
                item.color === "white"
                  ? "border-gray-400 bg-white dark:border-gray-500"
                  : "border-gray-600 bg-gray-700 dark:border-gray-400 dark:bg-gray-300"
              }`}
            />
            {item.color === "white" ? "White" : "Black"}
          </span>
          <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{item.games}g</span>
          {/* Score bar */}
          <div className="flex flex-1 items-center gap-1.5">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-elevated">
              <div
                className={`h-full rounded-full ${barColor}`}
                style={{ width: `${Math.min(100, Math.max(0, item.score_percent))}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
              {Math.round(item.score_percent)}%
            </span>
          </div>
        </div>
      </div>

      {/* Priority badge */}
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}
      >
        {badge.label}
      </span>

      {/* Explore toggle */}
      <button
        onClick={onToggleExplorer}
        title={isExplorerOpen ? "Close explorer" : "Explore stats & theory"}
        className={`flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
          isExplorerOpen
            ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700/60 dark:bg-brand-900/30 dark:text-brand-400"
            : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 dark:border-dark-border dark:text-gray-400 dark:hover:bg-dark-elevated"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="hidden h-3.5 w-3.5 sm:block">
          <circle cx="11" cy="11" r="8" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
        </svg>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-3 w-3 transition-transform ${isExplorerOpen ? "rotate-180" : ""}`}
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Study button */}
      <a
        href={item.lichess_opening_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition hover:opacity-80"
        style={{ borderColor: "#b05000", color: "#b05000" }}
        title={`Open ${item.opening_name} on Lichess`}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="hidden h-3.5 w-3.5 sm:block" aria-hidden="true">
          <path d="M19 22H5v-2h14v2M13 2a3 3 0 00-3 3c0 .88.39 1.67 1 2.22V8l-3 1-2 4h2v1H6l-1 3h14l-1-3h-2v-1h2l-2-4-3-1V7.22c.61-.55 1-1.34 1-2.22a3 3 0 00-1-2.24V2h-1z" />
        </svg>
        Study
        <svg viewBox="0 0 20 20" fill="currentColor" className="hidden h-3 w-3 sm:block" aria-hidden="true">
          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </a>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const DEFAULT_VISIBLE = 5;

export function OpeningStudyPlan({ slug }: { slug: string }) {
  const [suggestions, setSuggestions] = useState<OpeningStudySuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ColorTab>("all");
  const [expanded, setExpanded] = useState(false);
  const [openExplorerKey, setOpenExplorerKey] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api
      .getOpeningStudies(slug, 50)
      .then((res) => setSuggestions(res.suggestions))
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));
  }, [slug]);

  // Filter by color tab
  const filtered =
    tab === "all" ? suggestions : suggestions.filter((s) => s.color === tab);

  // If not loading and nothing to show, render nothing
  if (!loading && suggestions.length === 0) return null;

  const visible = expanded ? filtered : filtered.slice(0, DEFAULT_VISIBLE);
  const hiddenCount = filtered.length - DEFAULT_VISIBLE;

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-dark-border dark:bg-dark-surface">
      {/* Card header */}
      <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-dark-border">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
          {/* Book / study icon */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Opening Studies</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Ranked by games played &times; room to improve</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-100 px-4 py-2 dark:border-dark-border">
        {(["all", "white", "black"] as ColorTab[]).map((t) => {
          const count =
            t === "all"
              ? suggestions.length
              : suggestions.filter((s) => s.color === t).length;
          return (
            <button
              key={t}
              onClick={() => { setTab(t); setExpanded(false); setOpenExplorerKey(null); }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                tab === t
                  ? "bg-gray-100 text-gray-900 dark:bg-dark-elevated dark:text-gray-100"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {t === "white" && (
                <span className="h-2 w-2 rounded-full border border-gray-400 bg-white dark:border-gray-500" />
              )}
              {t === "black" && (
                <span className="h-2 w-2 rounded-full border border-gray-600 bg-gray-700 dark:border-gray-400 dark:bg-gray-300" />
              )}
              {t.charAt(0).toUpperCase() + t.slice(1)}
              <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600 dark:bg-dark-muted dark:text-gray-400">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="space-y-1.5 p-4">
        {loading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : filtered.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-600">
            No suggestions for {tab === "all" ? "any color" : tab}.
          </p>
        ) : (
          <>
            {visible.map((item, i) => {
              const explorerKey = `${item.eco_code}-${item.color}`;
              const isOpen = openExplorerKey === explorerKey;
              return (
                <div key={explorerKey + i}>
                  <SuggestionRow
                    item={item}
                    isExplorerOpen={isOpen}
                    onToggleExplorer={() =>
                      setOpenExplorerKey(isOpen ? null : explorerKey)
                    }
                  />
                  {isOpen && (
                    <div className="rounded-b-lg border border-t border-brand-200/60 bg-gray-50/70 dark:border-brand-800/40 dark:bg-dark-elevated">
                      <OpeningExplorer
                        slug={slug}
                        ecoCode={item.eco_code}
                        openingName={item.opening_name}
                        playerColor={item.color}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Show all / collapse toggle */}
            {hiddenCount > 0 && !expanded && (
              <button
                onClick={() => setExpanded(true)}
                className="mt-1 w-full rounded-lg border border-dashed border-gray-200 py-2 text-xs text-gray-500 transition hover:bg-gray-50 dark:border-dark-border dark:text-gray-500 dark:hover:bg-dark-elevated"
              >
                Show all {filtered.length}
              </button>
            )}
            {expanded && filtered.length > DEFAULT_VISIBLE && (
              <button
                onClick={() => setExpanded(false)}
                className="mt-1 w-full rounded-lg border border-dashed border-gray-200 py-2 text-xs text-gray-500 transition hover:bg-gray-50 dark:border-dark-border dark:text-gray-500 dark:hover:bg-dark-elevated"
              >
                Show less
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
