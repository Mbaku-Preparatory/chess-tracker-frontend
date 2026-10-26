"use client";

/**
 * My prep — the same view as an opponent's prep, on your own record.
 *
 * The slug is resolved from /api/me/player/ rather than read from the URL,
 * which is the whole point of this route existing: your profile lives at /me,
 * not at /players/<some-slug-you-never-chose>.
 */

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import { PlayerPrepView } from "@/components/players/PlayerPrepView";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";

export default function MyPrepPage() {
  const [slug, setSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getMyPlayer()
      .then((me) => setSlug(me.player.slug))
      .catch((err) => setError(userMessage(err, "Couldn't load your profile.")));
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }
  if (!slug) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <CardSkeleton />
      </div>
    );
  }
  return <PlayerPrepView slug={slug} isSelf />;
}
