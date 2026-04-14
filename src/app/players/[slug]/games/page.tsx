"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchPlayerDetail } from "@/store/slices/playerDetailSlice";
import { PageHeader } from "@/components/ui/PageHeader";
import { OpeningTreeView } from "@/components/players/OpeningTreeView";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";

export default function GamesPage() {
  const { slug } = useParams<{ slug: string }>();
  const dispatch = useAppDispatch();
  const { player, loading } = useAppSelector((s) => s.playerDetail);

  useEffect(() => {
    if (slug) dispatch(fetchPlayerDetail(slug));
  }, [dispatch, slug]);

  if (loading) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={player ? `${player.full_name} — Games by Opening` : "Games by Opening"}
        subtitle="Drill into any opening to see individual games"
        actions={
          player && (
            <Link href={`/players/${slug}`} className="btn-secondary text-sm">
              Back to profile
            </Link>
          )
        }
      />

      {slug && <OpeningTreeView slug={slug} />}
    </div>
  );
}
