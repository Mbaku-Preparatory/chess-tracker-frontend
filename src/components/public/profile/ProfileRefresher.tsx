"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { revalidatePlayer } from "@/app/(public)/player/actions";
import { useT } from "@/hooks/useT";
import { graphqlPost } from "@/lib/publicGraphql";

import { setGamesStatus } from "./refreshState";

const POLL_EVERY_MS = 3000;
const SLOW_AFTER_MS = 90 * 1000;
const GIVE_UP_AFTER_MS = 4 * 60 * 1000;
// Anything older is refreshed when someone looks: FIDE publishes monthly.
const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

/** Judged here, at view time: the page is cached for days, so the server's
 * clock at render time says nothing about now. */
function stale(fetchedAt: string | null): boolean {
  return !fetchedAt || Date.now() - new Date(fetchedAt).getTime() > STALE_AFTER_MS;
}

type Phase = "working" | "slow" | "stopped" | "hidden";

/** A failed request is a miss, not an error: the poll asks again. */
const graphql = <T,>(query: string, variables: Record<string, unknown>) => graphqlPost<T>(query, variables).catch(() => null);

/**
 * Fetches this profile's games when they are missing or stale, and shows the
 * visitor what is happening while it does. (Its rating history needs no fetch:
 * the backend builds it from FIDE's rating lists, backend rating_history.py.)
 *
 * Runs in the browser after the page has rendered, never on the server: the
 * request is rate-limited per visitor IP, and the server's IP would stand in
 * for every visitor.
 *
 * A profile whose games are merely stale refreshes quietly; the panel only
 * shows when they are actually missing.
 */
export function ProfileRefresher({
  fideId,
  gamesFetchedAt,
  queued,
}: {
  fideId: string;
  gamesFetchedAt: string | null;
  queued: boolean;
}) {
  const router = useRouter();
  const t = useT();
  // Missing is always stale too, so the panel shows exactly when the games are
  // missing, and the first render needs no clock (it must match the server's).
  const [phase, setPhase] = useState<Phase>(gamesFetchedAt == null ? "working" : "hidden");

  // What the page was rendered with. Read once: the games landing re-renders
  // the page and hands this component new props, and that must not restart
  // the request.
  const initial = useRef({ gamesFetchedAt, queued });

  useEffect(() => {
    const start = initial.current;
    let seen = start.gamesFetchedAt;
    // The placeholders say what is happening while the games are missing
    // (refreshState.ts); whatever the page last said belongs to another profile.
    let cancelled = false;
    const say = (status: "fetching" | "unavailable") => !cancelled && !seen && setGamesStatus(status);
    setGamesStatus("waiting");
    if (!stale(start.gamesFetchedAt) && !start.queued) return;
    const startedAt = Date.now();
    if (start.queued) say("fetching");

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
          // Busy or refused. Only worth saying when the games are missing;
          // a stale profile that has them stays quiet.
          if (!cancelled) setPhase((p) => (p === "hidden" ? p : "stopped"));
          say("unavailable");
          return;
        }
        say("fetching");
      }

      while (!cancelled && Date.now() - startedAt < GIVE_UP_AFTER_MS) {
        await new Promise((r) => setTimeout(r, POLL_EVERY_MS));
        if (cancelled) return;
        if (Date.now() - startedAt > SLOW_AFTER_MS) setPhase((p) => (p === "working" ? "slow" : p));

        const polled = await graphql<{ publicPlayer: { refreshStatus: string | null; gamesFetchedAt: string | null } | null }>(
          "query Status($fideId: String!) { publicPlayer(fideId: $fideId) { refreshStatus gamesFetchedAt } }",
          { fideId },
        );
        const now = polled?.publicPlayer;
        if (!now) continue;

        if (now.gamesFetchedAt && now.gamesFetchedAt !== seen) {
          seen = now.gamesFetchedAt;
          await landed();
        }
        if (now.refreshStatus == null) {
          // Finished. If it did not bring the games, they are not coming.
          if (!cancelled) setPhase("hidden");
          say("unavailable");
          return;
        }
      }
      if (!cancelled) setPhase((p) => (p === "hidden" ? p : "stopped"));
      say("unavailable");
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [fideId, router]);

  if (phase === "hidden") return null;

  const heading =
    phase === "stopped"
      ? t("This player's data could not be fetched right now")
      : phase === "slow"
        ? t("Still fetching: this is taking longer than usual")
        : t("Fetching this player's data");
  const note =
    phase === "stopped"
      ? t("Ratings, ranks and rating history above are current. Games will be fetched the next time this page is opened.")
      : t("You can keep reading; the page fills in by itself when they arrive.");

  return (
    <section role="status" aria-live="polite" className="flex flex-col gap-1 rounded-xl bg-ink-card px-5 py-4">
      <p className="text-[15px] font-[480] text-ink-text">{heading}</p>
      <p className="text-[13px] text-ink-faint">{note}</p>
    </section>
  );
}
