"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchPlayerDetail } from "@/redux/actions/playerDetail";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { PerformanceSplitCard } from "@/components/players/PerformanceSplitCard";
import { OpeningBreakdownCard } from "@/components/players/OpeningBreakdownCard";
import { StrengthWeaknessCard } from "@/components/players/StrengthWeaknessCard";
import { GamesTable } from "@/components/players/GamesTable";

function FideSection({ slug, fideId }: { slug: string; fideId: string | null }) {
  const dispatch = useAppDispatch();
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [inputId, setInputId] = useState("");
  const [showInput, setShowInput] = useState(false);

  const doSync = useCallback(async (id?: string) => {
    setSyncing(true);
    setMessage(null);
    try {
      const data = await api.syncFide(slug, id);
      const fields = data.updated_fields.filter((f) => f !== "updated_at");
      setMessage(fields.length ? `Updated: ${fields.join(", ")}` : "Already up to date");
      dispatch(fetchPlayerDetail(slug));
      setShowInput(false);
    } catch (err: any) {
      setMessage(err?.body?.detail || err?.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [slug, dispatch]);

  if (fideId) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => doSync()}
          disabled={syncing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#1a3a6b]/30 bg-[#1a3a6b]/5 px-3 py-1.5 text-xs font-semibold text-[#1a3a6b] transition-colors hover:bg-[#1a3a6b]/10 disabled:opacity-50"
        >
          {syncing ? (
            <>
              <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Syncing…
            </>
          ) : (
            <>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sync from FIDE
            </>
          )}
        </button>
        {message && <span className="text-xs text-gray-500">{message}</span>}
      </div>
    );
  }

  // No FIDE ID yet — show an inline setter
  if (!showInput) {
    return (
      <button
        type="button"
        onClick={() => setShowInput(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:border-[#1a3a6b]/40 hover:text-[#1a3a6b] dark:border-dark-border dark:text-gray-400"
      >
        + Set FIDE ID
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (inputId.trim()) doSync(inputId.trim()); }}
      className="flex flex-wrap items-center gap-2"
    >
      <input
        type="text"
        value={inputId}
        onChange={(e) => setInputId(e.target.value)}
        placeholder="e.g. 12345678"
        autoFocus
        className="w-36 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:border-[#1a3a6b] focus:outline-none focus:ring-1 focus:ring-[#1a3a6b] dark:border-dark-border dark:bg-dark-elevated dark:text-gray-100"
      />
      <button
        type="submit"
        disabled={syncing || !inputId.trim()}
        className="inline-flex items-center gap-1 rounded-lg bg-[#1a3a6b] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#142d54] disabled:opacity-60"
      >
        {syncing ? "Syncing…" : "Save & Sync"}
      </button>
      <button
        type="button"
        onClick={() => { setShowInput(false); setMessage(null); }}
        className="text-xs text-gray-400 hover:text-gray-600"
      >
        Cancel
      </button>
      {message && <span className="text-xs text-red-600 dark:text-red-400">{message}</span>}
    </form>
  );
}

export default function PlayerDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { player, loading, error } = useAppSelector((s) => s.playerDetail);

  useEffect(() => {
    if (slug) dispatch(fetchPlayerDetail(slug));
  }, [dispatch, slug]);

  // Your own record has a home, and this is not it. Old links and anything
  // that guessed the slug land here; send them to /me rather than render the
  // viewer to themselves as though they were an opponent being scouted.
  useEffect(() => {
    if (player?.is_self) router.replace("/me");
  }, [player?.is_self, router]);

  if (loading) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <CardSkeleton />
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {error || "Player not found"}
        </h2>
        <Link href="/home" className="btn-primary mt-4 inline-flex">
          Back to players
        </Link>
      </div>
    );
  }

  const ps = player.performance_summary;
  const whiteOpenings = player.opening_stats.filter((o) => o.color_choice === "white").slice(0, 5);
  const blackOpenings = player.opening_stats.filter((o) => o.color_choice === "black").slice(0, 5);

  return (
    <div>
      {/* Profile Header */}
      <div className="card mb-8 p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-2xl font-bold text-brand-700">
            {player.full_name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {player.full_name}
              </h1>
              {player.title && (
                <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-sm font-bold text-amber-800">
                  {player.title}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
              {player.federation && <span>{player.federation}</span>}
              {player.fide_id && <span>FIDE #{player.fide_id}</span>}
              {player.birth_year && <span>Born {player.birth_year}</span>}
            </div>
            {player.game_source_counts && (() => {
              const sc = player.game_source_counts!;
              const otb = sc.chess_results ?? 0;
              const cc = sc.chess_com ?? 0;
              const li = sc.lichess ?? 0;
              if (!otb && !cc && !li) return null;
              return (
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  {otb > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      {otb} OTB
                    </span>
                  )}
                  {cc > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-[#7fa650]" />
                      {cc} Chess.com
                    </span>
                  )}
                  {li > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-[#b05000]" />
                      {li} Lichess
                    </span>
                  )}
                </div>
              );
            })()}
            <div className="mt-3">
              <FideSection slug={slug} fideId={player.fide_id} />
            </div>
            {player.bio && (
              <p className="mt-4 max-w-3xl leading-relaxed text-gray-600 dark:text-gray-400">
                {player.bio}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick action buttons */}
      <div className="no-print mb-6 flex flex-wrap gap-3">
        <Link href={`/players/${slug}/games`} className="btn-primary">
          View All Games
        </Link>

        <Link
          href={`/players/${slug}/prep?tab=ask`}
          className="btn-secondary inline-flex items-center gap-2"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
          Ask Mbaku
        </Link>

        <Link href={`/players/${slug}/prep`} className="btn-secondary inline-flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Opening Tree
        </Link>

        <Link
          href={`/players/${slug}/import?source=chess_results`}
          className="btn-secondary inline-flex items-center gap-2"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Import Games
        </Link>
      </div>

      {/* Ratings Row */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Standard"
          value={player.standard_rating ?? "—"}
          sublabel="FIDE Standard"
        />
        <StatCard
          label="Rapid"
          value={player.rapid_rating ?? "—"}
          sublabel="FIDE Rapid"
        />
        <StatCard
          label="Blitz"
          value={player.blitz_rating ?? "—"}
          sublabel="FIDE Blitz"
        />
      </div>

      {/* Performance Summary */}
      {ps && (
        <>
          <SectionContainer title="Performance Overview" subtitle={`Based on ${ps.total_games} games analyzed`}>
            <div className="grid gap-4 sm:grid-cols-5">
              <StatCard label="Games" value={ps.total_games} />
              <StatCard label="Wins" value={ps.wins} variant="success" />
              <StatCard label="Draws" value={ps.draws} variant="warning" />
              <StatCard label="Losses" value={ps.losses} variant="danger" />
              <StatCard
                label="Win Rate"
                value={`${ps.win_rate}%`}
                variant={ps.win_rate >= 50 ? "success" : "danger"}
              />
            </div>
            {ps.summary_text && (
              <div className="card mt-4 p-5">
                <p className="leading-relaxed text-gray-600 dark:text-gray-400">
                  {ps.summary_text}
                </p>
              </div>
            )}
          </SectionContainer>

          <SectionContainer title="White vs Black Performance">
            <div className="grid gap-4 sm:grid-cols-2">
              <PerformanceSplitCard
                label="As White"
                games={ps.white_games}
                score={Number(ps.white_score)}
                colorIndicator="white"
              />
              <PerformanceSplitCard
                label="As Black"
                games={ps.black_games}
                score={Number(ps.black_score)}
                colorIndicator="black"
              />
            </div>
          </SectionContainer>
        </>
      )}

      {/* Opening Repertoire */}
      {(whiteOpenings.length > 0 || blackOpenings.length > 0) && (
        <SectionContainer
          title="Opening Repertoire"
          subtitle="Top 5 openings by color"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <OpeningBreakdownCard
              title="White Openings"
              openings={whiteOpenings}
              colorLabel="White"
            />
            <OpeningBreakdownCard
              title="Black Openings"
              openings={blackOpenings}
              colorLabel="Black"
            />
          </div>
          <div className="mt-3 text-right">
            <Link href={`/players/${slug}/games`} className="text-sm text-brand-600 hover:underline">
              View all games →
            </Link>
          </div>
        </SectionContainer>
      )}

      {/* Strengths & Weaknesses */}
      {(player.strengths.length > 0 || player.weaknesses.length > 0) && (
        <SectionContainer title="Strengths & Weaknesses">
          <div className="grid gap-4 sm:grid-cols-2">
            {player.strengths.length > 0 && (
              <StrengthWeaknessCard items={player.strengths} type="strength" />
            )}
            {player.weaknesses.length > 0 && (
              <StrengthWeaknessCard items={player.weaknesses} type="weakness" />
            )}
          </div>
        </SectionContainer>
      )}

      {/* Recent Games */}
      {player.recent_games.length > 0 && (
        <SectionContainer
          title="Recent Games"
          action={
            <Link href={`/players/${slug}/games`} className="btn-secondary text-sm">
              View all games
            </Link>
          }
        >
          <GamesTable games={player.recent_games} />
        </SectionContainer>
      )}

    </div>
  );
}
