import Link from "next/link";

import { federationFor } from "@/lib/federations";
import { profilePath } from "@/lib/publicPlayer";
import { RANKINGS_PAGE_SIZE, rankingsPath, type RankingEntry, type RankingsView } from "@/lib/rankings";

function Name({ entry }: { entry: RankingEntry }) {
  const { player } = entry;
  const title = player.title || player.womenTitle;
  const fed = federationFor(player.federation);
  return (
    <Link href={profilePath(player)} className="inline-flex items-baseline gap-2 hover:text-accent-soft">
      {fed.flag && (
        <span aria-hidden="true" className="text-[15px]">
          {fed.flag}
        </span>
      )}
      <span>
        {title && <span className="mr-1.5 text-accent">{title}</span>}
        <span className="text-ink-text">{player.fullName}</span>
      </span>
    </Link>
  );
}

export function RankingsTable({ view, count, results }: { view: RankingsView; count: number; results: RankingEntry[] }) {
  const pages = Math.max(1, Math.ceil(count / RANKINGS_PAGE_SIZE));
  const first = (view.page - 1) * RANKINGS_PAGE_SIZE + 1;
  const showBorn = view.list === "juniors" || view.list === "girls";

  return (
    <div className="flex flex-col gap-4">
      {/* Phones: one player per row, the country under the name. */}
      <ol className="flex flex-col divide-y divide-ink-line/60 sm:hidden">
        {results.map((e) => (
          <li key={e.player.fideId} className="flex items-center gap-3 py-3 text-[15px]">
            <span className="w-10 shrink-0 tabular-nums text-ink-faint">{e.rank}</span>
            <div className="flex min-w-0 flex-1 flex-col">
              <Name entry={e} />
              <span className="text-[12px] text-ink-faint">
                {federationFor(e.player.federation).name}
                {showBorn && e.birthYear ? ` · born ${e.birthYear}` : ""}
              </span>
            </div>
            <span className="tabular-nums text-ink-text">{e.rating}</span>
          </li>
        ))}
      </ol>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-[14px]">
          <thead>
            <tr className="border-b border-ink-line text-[12px] uppercase tracking-[0.06em] text-ink-faint">
              <th scope="col" className="w-16 py-3 pr-3 font-[520]">Rank</th>
              <th scope="col" className="px-3 py-3 font-[520]">Player</th>
              <th scope="col" className="px-3 py-3 font-[520]">Federation</th>
              {showBorn && <th scope="col" className="px-3 py-3 font-[520]">Born</th>}
              <th scope="col" className="py-3 pl-3 text-right font-[520]">Rating</th>
            </tr>
          </thead>
          <tbody className="text-ink-muted">
            {results.map((e) => (
              <tr key={e.player.fideId} className="border-b border-ink-line/60">
                <td className="py-3 pr-3 tabular-nums text-ink-faint">{e.rank}</td>
                <td className="px-3 py-3">
                  <Name entry={e} />
                </td>
                <td className="px-3 py-3">{federationFor(e.player.federation).name}</td>
                {showBorn && <td className="px-3 py-3 tabular-nums">{e.birthYear ?? "—"}</td>}
                <td className="py-3 pl-3 text-right tabular-nums text-ink-text">{e.rating}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav className="flex items-center justify-between text-[14px]" aria-label="Rankings pages">
          {view.page > 1 ? (
            <Link href={rankingsPath({ ...view, page: view.page - 1 })} rel="prev" className="rounded-pill bg-ink-raised px-4 py-2 hover:bg-ink-line">
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="tabular-nums text-ink-faint">
            {first.toLocaleString("en")}–{(first + results.length - 1).toLocaleString("en")} of {count.toLocaleString("en")}
          </span>
          {view.page < pages ? (
            <Link href={rankingsPath({ ...view, page: view.page + 1 })} rel="next" className="rounded-pill bg-ink-raised px-4 py-2 hover:bg-ink-line">
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
