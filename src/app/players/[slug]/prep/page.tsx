"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchPlayerDetail } from "@/store/slices/playerDetailSlice";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { PrepSummaryPanel } from "@/components/players/PrepSummaryPanel";
import type { PrepSummary } from "@/types";

export default function PrepPage() {
  const { slug } = useParams<{ slug: string }>();
  const dispatch = useAppDispatch();
  const { player, loading: playerLoading } = useAppSelector((s) => s.playerDetail);

  const [data, setData] = useState<PrepSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) dispatch(fetchPlayerDetail(slug));
  }, [dispatch, slug]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    api
      .getPrepSummary(slug)
      .then(setData)
      .catch((err) => setError(err.message ?? "Failed to load prep summary."))
      .finally(() => setLoading(false));
  }, [slug]);

  if (playerLoading || loading) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={player ? `${player.full_name} — Opening Tree` : "Opening Tree"}
        subtitle="Move-level breakdown of opening tendencies across all imported games"
        actions={
          player && (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/players/${slug}/import`}
                className="btn-secondary inline-flex items-center gap-1.5 text-sm"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Import Games
              </Link>
              <Link href={`/players/${slug}`} className="btn-secondary text-sm">
                Back to profile
              </Link>
            </div>
          )
        }
      />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : data ? (
        <PrepSummaryPanel data={data} slug={slug} />
      ) : null}
    </div>
  );
}
