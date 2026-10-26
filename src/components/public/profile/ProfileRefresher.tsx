"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { revalidatePlayer } from "@/app/(public)/player/actions";
import { GRAPHQL_URL } from "@/lib/site";

const POLL_EVERY_MS = 4000;
const GIVE_UP_AFTER_MS = 3 * 60 * 1000;

type Phase = "idle" | "working" | "done" | "unavailable";

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
 * Asks for this profile's history and games to be fetched, then waits for it.
 *
 * Runs in the browser after the page has rendered, never on the server: the
 * request is rate-limited per visitor IP, and the server's IP would stand in
 * for every visitor. Crawlers that run scripts are refused by the API.
 */
export function ProfileRefresher({
  fideId,
  needed,
  queued,
}: {
  fideId: string;
  needed: boolean;
  queued: boolean;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(needed || queued ? "working" : "idle");

  useEffect(() => {
    if (!needed && !queued) return;
    let cancelled = false;
    const startedAt = Date.now();

    async function run() {
      if (!queued) {
        const asked = await graphql<{ requestProfileRefresh: { outcome: string } }>(
          "mutation Refresh($fideId: String!) { requestProfileRefresh(fideId: $fideId) { outcome } }",
          { fideId },
        );
        const outcome = asked?.requestProfileRefresh.outcome;
        if (outcome === "fresh") {
          await revalidatePlayer(fideId);
          if (!cancelled) router.refresh();
          return;
        }
        if (outcome !== "queued") {
          if (!cancelled) setPhase("unavailable");
          return;
        }
      }

      while (!cancelled && Date.now() - startedAt < GIVE_UP_AFTER_MS) {
        await new Promise((r) => setTimeout(r, POLL_EVERY_MS));
        const polled = await graphql<{ publicPlayer: { refreshStatus: string | null } | null }>(
          "query Status($fideId: String!) { publicPlayer(fideId: $fideId) { refreshStatus } }",
          { fideId },
        );
        if (polled && polled.publicPlayer?.refreshStatus == null) {
          await revalidatePlayer(fideId);
          if (!cancelled) {
            setPhase("done");
            router.refresh();
          }
          return;
        }
      }
      if (!cancelled) setPhase("unavailable");
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [fideId, needed, queued, router]);

  if (phase !== "working") return null;
  return (
    <div role="status" className="flex items-center gap-3 rounded-xl bg-ink-card px-5 py-4 text-[14px] text-ink-muted">
      <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-accent" aria-hidden="true" />
      Fetching the latest rating history and games from FIDE and chess-results. This page updates when they arrive.
    </div>
  );
}
