"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { revalidatePlayer } from "@/app/(public)/player/actions";
import { GRAPHQL_URL } from "@/lib/site";

const POLL_EVERY_MS = 3000;
const SLOW_AFTER_MS = 90 * 1000;
const GIVE_UP_AFTER_MS = 4 * 60 * 1000;

type Part = "history" | "games";
type PartState = "fetching" | "done" | "ready";
type Phase = "working" | "slow" | "stopped" | "hidden";

const PARTS: { key: Part; label: string; source: string }[] = [
  { key: "history", label: "Rating history", source: "FIDE" },
  { key: "games", label: "Games", source: "chess-results.com" },
];

async function graphql<T>(query: string, variables: Record<string, unknown>): Promise<T | null> {
  try {
    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    if (!response.ok) return null;
    const body = await response.json();
    return body.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetches this profile's history and games when they are missing or stale,
 * and shows the visitor what is happening while it does.
 *
 * Runs in the browser after the page has rendered, never on the server: the
 * request is rate-limited per visitor IP, and the server's IP would stand in
 * for every visitor. Each part re-renders the page as soon as it lands, so
 * the rating chart does not wait for the games.
 *
 * A profile whose data is merely stale refreshes quietly; the panel only
 * shows when something on the page is actually missing.
 */
export function ProfileRefresher({
  fideId,
  historyFetchedAt,
  gamesFetchedAt,
  needed,
  queued,
}: {
  fideId: string;
  historyFetchedAt: string | null;
  gamesFetchedAt: string | null;
  needed: boolean;
  queued: boolean;
}) {
  const router = useRouter();
  const missing = historyFetchedAt == null || gamesFetchedAt == null;
  const [phase, setPhase] = useState<Phase>((needed || queued) && missing ? "working" : "hidden");
  const [parts, setParts] = useState<Record<Part, PartState>>({
    history: historyFetchedAt ? "ready" : "fetching",
    games: gamesFetchedAt ? "ready" : "fetching",
  });

  // What the page was rendered with. Read once: a part landing re-renders the
  // page and hands this component new props, and that must not restart the
  // whole request.
  const initial = useRef({ historyFetchedAt, gamesFetchedAt, needed, queued });

  useEffect(() => {
    const start = initial.current;
    if (!start.needed && !start.queued) return;
    let cancelled = false;
    const startedAt = Date.now();
    const seen = { history: start.historyFetchedAt, games: start.gamesFetchedAt };

    async function landed() {
      await revalidatePlayer(fideId);
      if (!cancelled) router.refresh();
    }

    async function run() {
      if (!start.queued) {
        const asked = await graphql<{ requestProfileRefresh: { outcome: string } }>(
          "mutation Refresh($fideId: String!) { requestProfileRefresh(fideId: $fideId) { outcome } }",
          { fideId },
        );
        const outcome = asked?.requestProfileRefresh.outcome;
        if (outcome === "fresh") {
          // Someone else's visit, or a coach's import, got there first.
          await landed();
          if (!cancelled) setPhase("hidden");
          return;
        }
        if (outcome !== "queued") {
          // Busy or refused. Only worth saying when the page is missing
          // something; a stale profile that has its data stays quiet.
          if (!cancelled) setPhase((p) => (p === "hidden" ? p : "stopped"));
          return;
        }
      }

      while (!cancelled && Date.now() - startedAt < GIVE_UP_AFTER_MS) {
        await new Promise((r) => setTimeout(r, POLL_EVERY_MS));
        if (cancelled) return;
        if (Date.now() - startedAt > SLOW_AFTER_MS) setPhase((p) => (p === "working" ? "slow" : p));

        const polled = await graphql<{
          publicPlayer: { refreshStatus: string | null; historyFetchedAt: string | null; gamesFetchedAt: string | null } | null;
        }>(
          "query Status($fideId: String!) { publicPlayer(fideId: $fideId) { refreshStatus historyFetchedAt gamesFetchedAt } }",
          { fideId },
        );
        const now = polled?.publicPlayer;
        if (!now) continue;

        let changed = false;
        for (const [part, value] of [["history", now.historyFetchedAt], ["games", now.gamesFetchedAt]] as const) {
          if (value && value !== seen[part]) {
            seen[part] = value;
            changed = true;
            setParts((p) => ({ ...p, [part]: "done" }));
          }
        }
        if (changed) await landed();

        if (now.refreshStatus == null) {
          if (!cancelled) setPhase("hidden");
          return;
        }
      }
      if (!cancelled) setPhase((p) => (p === "hidden" ? p : "stopped"));
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [fideId, router]);

  if (phase === "hidden") return null;

  const heading =
    phase === "stopped"
      ? "This player's data could not be fetched right now"
      : phase === "slow"
        ? "Still fetching: this is taking longer than usual"
        : "Fetching this player's data";
  const note =
    phase === "stopped"
      ? "Ratings and ranks above are current. Rating history and games will be fetched the next time this page is opened."
      : phase === "slow"
        ? "You can keep reading; the page fills in by itself when they arrive."
        : "This page fills in by itself as each part arrives.";

  return (
    <section role="status" aria-live="polite" className="flex flex-col gap-3 rounded-xl bg-ink-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <p className="text-[15px] font-[480] text-ink-text">{heading}</p>
        <p className="text-[13px] text-ink-faint">{note}</p>
      </div>
      {phase !== "stopped" && (
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
          {PARTS.filter(({ key }) => parts[key] !== "ready").map(({ key, label, source }) => (
            <li key={key} className="flex items-center gap-2 text-ink-muted">
              {parts[key] === "done" ? (
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-accent" aria-hidden="true">
                  <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <span className="h-2 w-2 animate-pulse rounded-full bg-accent motion-reduce:animate-none" aria-hidden="true" />
              )}
              <span>
                {label} <span className="text-ink-faint">from {source}</span>
                <span className="sr-only">{parts[key] === "done" ? ": done" : ": fetching"}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
