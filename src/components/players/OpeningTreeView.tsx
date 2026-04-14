"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ColorBadge, ResultBadge, EcoBadge } from "@/components/ui/Badge";
import { GamesTable } from "./GamesTable";
import type { OpeningStat, Game, GameSource, PaginatedResponse, ColorChoice } from "@/types";

interface OpeningTreeViewProps {
  slug: string;
}

interface FamilyGroup {
  family: string;
  totalGames: number;
  weightedScore: number | null; // null if no score data
  scoreCount: number; // number of variations with scores (for avg calc)
  variations: OpeningStat[];
}

function deriveFamily(openingName: string): string {
  const colonIdx = openingName.indexOf(":");
  return colonIdx !== -1 ? openingName.slice(0, colonIdx).trim() : openingName.trim();
}

function groupByFamily(stats: OpeningStat[]): FamilyGroup[] {
  const map = new Map<string, FamilyGroup>();

  for (const stat of stats) {
    const family = deriveFamily(stat.opening_name);
    if (!map.has(family)) {
      map.set(family, { family, totalGames: 0, weightedScore: null, scoreCount: 0, variations: [] });
    }
    const group = map.get(family)!;
    group.totalGames += stat.games_count;
    group.variations.push(stat);
    if (stat.score_percent !== null) {
      group.weightedScore = (group.weightedScore ?? 0) + Number(stat.score_percent) * stat.games_count;
      group.scoreCount += stat.games_count;
    }
  }

  // Compute weighted avg score per family
  for (const group of map.values()) {
    if (group.weightedScore !== null && group.scoreCount > 0) {
      group.weightedScore = group.weightedScore / group.scoreCount;
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalGames - a.totalGames);
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score);
  const color =
    pct >= 60 ? "bg-emerald-500" : pct >= 45 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500">{pct}%</span>
    </div>
  );
}

interface VariationRowProps {
  stat: OpeningStat;
  slug: string;
  sourceFilter: GameSource | "";
  isExpanded: boolean;
  onToggle: () => void;
}

function VariationRow({ stat, slug, sourceFilter, isExpanded, onToggle }: VariationRowProps) {
  const [games, setGames] = useState<Game[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Reset games when sourceFilter changes
  useEffect(() => {
    if (isExpanded) {
      setGames(null);
      loadGames(1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceFilter]);

  async function loadGames(p = 1) {
    setLoading(true);
    setError(null);
    try {
      const data: PaginatedResponse<Game> = await api.getPlayerGames(slug, {
        eco_code: stat.eco_code,
        color_played: stat.color_choice,
        ...(sourceFilter ? { source: sourceFilter } : {}),
        page: p,
      });
      setGames((prev) => (p === 1 ? data.results : [...(prev ?? []), ...data.results]));
      setTotal(data.count);
      setPage(p);
    } catch {
      setError("Failed to load games.");
    } finally {
      setLoading(false);
    }
  }

  function handleToggle() {
    onToggle();
    if (!isExpanded && games === null) {
      loadGames(1);
    }
  }

  const variationLabel = (() => {
    const colonIdx = stat.opening_name.indexOf(":");
    return colonIdx !== -1
      ? stat.opening_name.slice(colonIdx + 1).trim()
      : stat.opening_name.trim();
  })();

  return (
    <div className="border-t border-gray-100 first:border-t-0">
      {/* Variation header row */}
      <button
        onClick={handleToggle}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
      >
        {/* Expand indicator */}
        <svg
          className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>

        {/* ECO badge */}
        <EcoBadge code={stat.eco_code} />

        {/* Variation name */}
        <span className="flex-1 truncate text-sm text-gray-700">
          {variationLabel || stat.opening_name}
        </span>

        {/* Color */}
        <ColorBadge color={stat.color_choice} />

        {/* Games count */}
        <span className="w-16 text-right text-xs text-gray-500">
          {stat.games_count} game{stat.games_count !== 1 ? "s" : ""}
        </span>

        {/* Score */}
        {stat.score_percent !== null ? (
          <div className="w-24">
            <ScoreBar score={Number(stat.score_percent)} />
          </div>
        ) : (
          <div className="w-24" />
        )}
      </button>

      {/* Games panel */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50/60 px-4 pb-4 pt-3">
          {loading && games === null ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-gray-200" />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : games && games.length > 0 ? (
            <>
              <GamesTable games={games} />
              {total > games.length && (
                <div className="mt-3 text-center">
                  <button
                    onClick={() => loadGames(page + 1)}
                    disabled={loading}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
                  >
                    {loading ? "Loading…" : `Show more (${total - games.length} remaining)`}
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">No games found.</p>
          )}
        </div>
      )}
    </div>
  );
}

interface FamilyRowProps {
  group: FamilyGroup;
  slug: string;
  sourceFilter: GameSource | "";
}

function FamilyRow({ group, slug, sourceFilter }: FamilyRowProps) {
  const [open, setOpen] = useState(false);
  const [expandedVariations, setExpandedVariations] = useState<Set<string>>(new Set());

  // Collapse everything when source filter changes
  useEffect(() => {
    setOpen(false);
    setExpandedVariations(new Set());
  }, [sourceFilter]);

  function toggleVariation(key: string) {
    setExpandedVariations((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Family header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50"
      >
        <svg
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>

        <span className="flex-1 font-semibold text-gray-900">{group.family}</span>

        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
          {group.totalGames} game{group.totalGames !== 1 ? "s" : ""}
        </span>

        <span className="ml-1 w-12 text-right text-xs text-gray-400">
          {group.variations.length} line{group.variations.length !== 1 ? "s" : ""}
        </span>

        {group.weightedScore !== null ? (
          <div className="w-24">
            <ScoreBar score={group.weightedScore} />
          </div>
        ) : (
          <div className="w-24" />
        )}
      </button>

      {/* Variations list */}
      {open && (
        <div className="border-t border-gray-100">
          {group.variations.map((stat) => {
            const key = `${stat.color_choice}-${stat.eco_code}`;
            return (
              <VariationRow
                key={key}
                stat={stat}
                slug={slug}
                sourceFilter={sourceFilter}
                isExpanded={expandedVariations.has(key)}
                onToggle={() => toggleVariation(key)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

const SOURCE_OPTIONS: { value: GameSource | ""; label: string }[] = [
  { value: "", label: "All sources" },
  { value: "chess_com", label: "Chess.com" },
  { value: "lichess", label: "Lichess" },
  { value: "pgn_import", label: "FIDE / Chess-Results" },
  { value: "manual", label: "Other" },
];

export function OpeningTreeView({ slug }: OpeningTreeViewProps) {
  const [families, setFamilies] = useState<FamilyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [colorFilter, setColorFilter] = useState<"" | ColorChoice>("");
  const [sourceFilter, setSourceFilter] = useState<GameSource | "">("");

  useEffect(() => {
    setLoading(true);
    setFamilies([]);
    api
      .getPlayerOpenings(slug, sourceFilter || undefined)
      .then((data) => {
        setFamilies(groupByFamily(data));
      })
      .catch(() => setError("Could not load opening data."))
      .finally(() => setLoading(false));
  }, [slug, sourceFilter]);

  const filtered = colorFilter
    ? families.map((f) => ({
        ...f,
        variations: f.variations.filter((v) => v.color_choice === colorFilter),
      })).filter((f) => f.variations.length > 0)
    : families;
  const hasActiveFilters = Boolean(colorFilter || sourceFilter);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-200" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div>
      {/* Filters row */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {/* Color pills */}
        <div className="flex items-center gap-1.5">
          {(["", "white", "black"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setColorFilter(c)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                colorFilter === c
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {c === "" ? "All colors" : c === "white" ? "As White" : "As Black"}
            </button>
          ))}
        </div>

        {/* Divider */}
        <span className="h-4 w-px bg-gray-200" />

        {/* Source selector */}
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as GameSource | "")}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          {SOURCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <span className="ml-auto text-xs text-gray-400">
          {filtered.length} opening family{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((group) => (
            <FamilyRow key={group.family} group={group} slug={slug} sourceFilter={sourceFilter} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-500">
            {hasActiveFilters
              ? "No opening data matches the current filters. Adjust the source or color filters and try again."
              : "No opening data yet. Import some games first."}
          </p>
        </div>
      )}
    </div>
  );
}
