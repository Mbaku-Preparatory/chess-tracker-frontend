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
        title={player ? `${player.full_name} — Prep Summary` : "Prep Summary"}
        subtitle="Move-level breakdown of opening tendencies across all imported games"
        actions={
          player && (
            <Link href={`/players/${slug}`} className="btn-secondary text-sm">
              Back to profile
            </Link>
          )
        }
      />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : data ? (
        <PrepSummaryPanel data={data} />
      ) : null}
    </div>
  );
}
