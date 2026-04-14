import Link from "next/link";

import type { PGNImportResult } from "@/types";

export function ImportResultPanel({ result }: { result: PGNImportResult }) {
  const {
    player_public_id,
    player_slug,
    player_name,
    games_created,
    games_updated,
    games_skipped,
    games_imported,
    opening_summary,
    result_summary,
  } = result;
  const { wins, draws, losses } = result_summary;
  const total = wins + draws + losses;
  const noneImported = games_imported === 0;
  const playerRef = player_public_id || player_slug;

  return (
    <div className="mt-8 space-y-4">
      {/* ── Banner ── */}
      <div
        className={`rounded-xl border px-5 py-4 ${
          noneImported ? "border-amber-200 bg-amber-50" : "border-green-200 bg-green-50"
        }`}
      >
        {noneImported ? (
          <p className="text-sm font-semibold text-amber-800">
            No games were imported.
            {games_skipped > 0 && (
              <span className="ml-1 font-normal text-amber-700">
                {games_skipped} game{games_skipped !== 1 ? "s" : ""} skipped — the player name
                didn&rsquo;t match any PGN header. Try &ldquo;Always White&rdquo; or &ldquo;Always
                Black&rdquo;.
              </span>
            )}
          </p>
        ) : (
          <>
            <p className="text-sm font-semibold text-green-800">
              {games_imported} game{games_imported !== 1 ? "s" : ""} imported for{" "}
              <span className="font-bold">{player_name}</span>.
            </p>

            {/* Created / updated / skipped breakdown */}
            <p className="mt-0.5 text-xs text-green-700">
              {games_created > 0 && (
                <span>
                  {games_created} new
                  {games_updated > 0 || games_skipped > 0 ? " · " : ""}
                </span>
              )}
              {games_updated > 0 && (
                <span>
                  {games_updated} already existed (updated)
                  {games_skipped > 0 ? " · " : ""}
                </span>
              )}
              {games_skipped > 0 && (
                <span>{games_skipped} skipped (name mismatch or unknown result)</span>
              )}
            </p>
          </>
        )}

        {/* ── Primary CTA — view profile ── */}
        <div className="mt-3">
          <Link
            href={`/players/${playerRef}`}
            className="btn-primary inline-flex items-center gap-1.5 text-sm"
          >
            View Player Profile
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </div>

      {!noneImported && (
        <>
          {/* ── Win / Draw / Loss ── */}
          <div className="card p-5">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Results from this import
            </h3>
            <div className="flex gap-3">
              {[
                { label: "Wins", value: wins, bar: "bg-green-400" },
                { label: "Draws", value: draws, bar: "bg-yellow-400" },
                { label: "Losses", value: losses, bar: "bg-red-400" },
              ].map(({ label, value, bar }) => (
                <div key={label} className="flex-1 rounded-lg bg-gray-50 px-3 py-3 text-center">
                  <div className={`mx-auto mb-1.5 h-1 w-8 rounded-full ${bar}`} />
                  <div className="text-xl font-bold text-gray-900">{value}</div>
                  <div className="text-xs text-gray-500">{label}</div>
                  {total > 0 && (
                    <div className="mt-0.5 text-xs text-gray-400">
                      {Math.round((value / total) * 100)}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Opening breakdown with percentages ── */}
          {opening_summary.length > 0 && (
            <div className="card p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Openings detected
              </h3>
              <ul className="space-y-3">
                {opening_summary.map(({ name, count, percent }) => (
                  <li key={name}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate font-medium text-gray-800">{name}</span>
                      <span className="ml-3 shrink-0 tabular-nums text-gray-500">
                        {percent}%
                        <span className="ml-1 text-xs text-gray-400">({count}×)</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-100">
                      <div
                        className="h-1.5 rounded-full bg-brand-500 transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
