import Link from "next/link";

import { getPrepProductName, getPrimaryRating } from "@/lib/marketplace";
import type { Player } from "@/types";

interface PlayerCardProps {
  player: Player;
}

export function PlayerCard({ player }: PlayerCardProps) {
  const initials = player.full_name
    .split(" ")
    .map((name) => name[0])
    .join("");
  const rating = getPrimaryRating(player);
  const productName = getPrepProductName(player);

  return (
    <div className="card group overflow-hidden border-gray-200 p-0 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg">
      <div className="border-b border-slate-100 bg-[radial-gradient(circle_at_top,_rgba(12,147,231,0.12),_transparent_55%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-6 py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-xl font-bold text-brand-700">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-lg font-semibold text-gray-900">
                  {player.full_name}
                </h3>
                {player.title && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-800">
                    {player.title}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm font-medium text-brand-700">{productName}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                {player.federation && <span>{player.federation}</span>}
                {rating && <span>Rating {rating}</span>}
                {player.games_count ? <span>{player.games_count} games tracked</span> : null}
              </div>
            </div>
          </div>

          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Prep Available
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 px-6 py-5">
        <Link href={`/players/${player.slug}/prep`} className="btn-primary flex-1">
          View Prep
        </Link>
        <Link href={`/players/${player.slug}`} className="btn-secondary">
          View Profile
        </Link>
      </div>
    </div>
  );
}
