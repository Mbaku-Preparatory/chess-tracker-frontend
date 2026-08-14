"use client";

/**
 * My profile — the signed-in user as a player, rather than as an account.
 *
 * Deliberately not a second copy of the player page. Everything statistical
 * about a player already lives at /players/[slug] and works on this record
 * unchanged, because a user's own profile *is* an ordinary player row. What
 * this page adds is the three things that are only true of yourself: getting
 * your FIDE ID in, watching your first import arrive, and asking Mbaku about
 * your own play rather than an opponent's.
 *
 * The deep views (all games, prep, openings) are links, not duplicates.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import type { ImportJob, MyPlayer } from "@/types";
import { AskAssistant } from "@/components/players/AskAssistant";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";

/** Statuses in which the worker still has something to do for us. */
const IN_FLIGHT = ["pending", "running"];

function isInFlight(job: ImportJob | null): boolean {
  return !!job && IN_FLIGHT.includes(job.status);
}

export default function MyProfilePage() {
  const [me, setMe] = useState<MyPlayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fideInput, setFideInput] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setMe(await api.getMyPlayer());
      setError(null);
    } catch (err) {
      setError(userMessage(err, "Couldn't load your profile."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Poll only while the worker is actually working, and stop the moment it
  // isn't. An interval left running because the job finished is the reason
  // "why is the app hammering the API" bugs are hard to find later.
  const job = me?.import_job ?? null;
  const inFlight = isInFlight(job);
  const jobIdRef = useRef<string | null>(null);
  jobIdRef.current = job?.id ?? null;

  useEffect(() => {
    if (!inFlight) return;
    const timer = setInterval(async () => {
      const id = jobIdRef.current;
      if (!id) return;
      try {
        const fresh = await api.getImportJob(id);
        setMe((prev) => (prev ? { ...prev, import_job: fresh } : prev));
        // The games only exist once the job stops; refetch the player then, so
        // the numbers on this page match what just landed.
        if (!isInFlight(fresh)) load();
      } catch {
        // A failed poll is not worth showing anyone — the next tick retries,
        // and the job is safe in the database either way.
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [inFlight, load]);

  async function saveFideId(e: React.FormEvent) {
    e.preventDefault();
    const value = fideInput.trim();
    if (!value || saving) return;
    setSaving(true);
    setError(null);
    try {
      setMe(await api.setMyFideId(value));
      setFideInput("");
    } catch (err) {
      setError(userMessage(err, "Couldn't save that FIDE ID."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <CardSkeleton />
      </div>
    );
  }

  if (!me) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-sm text-red-600 dark:text-red-400">
          {error ?? "Couldn't load your profile."}
        </p>
      </div>
    );
  }

  const player = me.player;
  const gamesCount = player.games_count ?? 0;
  const needsFideId = !player.fide_id;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <PageHeader
        title={player.full_name}
        subtitle={
          [player.title, player.federation].filter(Boolean).join(" · ") ||
          "Your profile"
        }
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Standard" value={player.standard_rating ?? "—"} />
        <StatCard label="Rapid" value={player.rapid_rating ?? "—"} />
        <StatCard label="Blitz" value={player.blitz_rating ?? "—"} />
        <StatCard label="Games" value={gamesCount} />
      </div>

      {needsFideId && (
        <SectionContainer title="Connect your FIDE ID">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Add it and we&apos;ll pull in your rating and your recent tournament
            games. Mbaku can only talk about play it can see.
          </p>
          <form onSubmit={saveFideId} className="mt-3 flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={fideInput}
              onChange={(e) => setFideInput(e.target.value)}
              placeholder="1503014"
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-dark-border dark:bg-dark-elevated dark:text-gray-100"
            />
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : "Find my games"}
            </button>
          </form>
        </SectionContainer>
      )}

      {inFlight && job && (
        <SectionContainer title="Fetching your games">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {job.total > 0
              ? `Tournament ${job.completed} of ${job.total} — ${job.games_imported} games so far.`
              : "Looking you up on chess-results…"}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            You can close this page. We&apos;ll email you when it&apos;s done.
          </p>
        </SectionContainer>
      )}

      {/* Finished, but found nothing. Saying so is the whole reason the payload
          carries the most recent job rather than only a running one. */}
      {!inFlight && job && job.total === 0 && player.fide_id && (
        <SectionContainer title="No games found">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            We couldn&apos;t find tournaments for FIDE ID {player.fide_id} on
            chess-results. That usually means your events aren&apos;t published
            there — your rating above is still from FIDE.
          </p>
          <button
            onClick={() => api.setMyFideId(player.fide_id!).then(setMe).catch(() => {})}
            className="btn-secondary mt-3"
          >
            Try again
          </button>
        </SectionContainer>
      )}

      {/* The signup import takes the 20 most recent events. Anyone with a
          longer career needs a way to ask for the rest, and this is the only
          place they would look for it. */}
      {!!player.fide_id && !inFlight && gamesCount > 0 && (
        <SectionContainer title="Older games">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Signing up imported your 20 most recent tournaments. If you have
            played longer than that, pull in the rest.
          </p>
          <button
            onClick={async () => {
              if (!player.fide_id) return;
              setSaving(true);
              try {
                setMe(await api.setMyFideId(player.fide_id, true));
              } catch (err) {
                setError(userMessage(err, "Couldn't start the import."));
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving}
            className="btn-secondary mt-3"
          >
            {saving ? "Starting…" : "Import my full history"}
          </button>
        </SectionContainer>
      )}

      {/* Under /me, not /players/<slug>. Your profile is not a scouting
          report on a stranger and should not read like one in the URL bar. */}
      {gamesCount > 0 && (
        <div className="flex flex-wrap gap-2">
          <Link href="/me/games" className="btn-secondary">
            All games
          </Link>
          <Link href="/me/prep" className="btn-secondary">
            Openings &amp; study plan
          </Link>
          <Link href="/me/prep?tab=ask" className="btn-secondary">
            Ask Mbaku
          </Link>
        </div>
      )}

      <SectionContainer title="Ask Mbaku about your play">
        {gamesCount > 0 ? (
          <AskAssistant slug={player.slug} playerName={player.full_name} isSelf />
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Once your games are in, Mbaku can go through your openings, your
            results and where you tend to lose the thread.
          </p>
        )}
      </SectionContainer>
    </div>
  );
}
