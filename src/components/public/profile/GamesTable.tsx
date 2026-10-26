import Link from "next/link";

import { GAMES_PAGE_SIZE, profilePath, type PlayerRef, type PublicGame } from "@/lib/publicPlayer";

const RESULT_LABEL: Record<PublicGame["result"], string> = {
  "1-0": "1–0",
  "0-1": "0–1",
  "1/2-1/2": "½–½",
  "*": "*",
};

function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** A side of a game: a link when we know whose profile it is. */
function Side({ name, elo, profile, self }: { name: string; elo: number | null; profile: PlayerRef | null; self: boolean }) {
  const label = (
    <>
      <span className={self ? "text-ink-text" : ""}>{name}</span>
      {elo != null && <span className="ml-1.5 tabular-nums text-ink-faint">{elo}</span>}
    </>
  );
  if (profile && !self) {
    return (
      <Link href={profilePath(profile)} className="hover:text-accent-soft">
        {label}
      </Link>
    );
  }
  return label;
}

/** The player's result from their side, for the coloured marker. */
function outcome(game: PublicGame, fideId: string): "win" | "draw" | "loss" | null {
  if (game.result === "1/2-1/2") return "draw";
  if (game.result === "*") return null;
  const asWhite = game.white?.fideId === fideId;
  const whiteWon = game.result === "1-0";
  return asWhite === whiteWon ? "win" : "loss";
}

const MARKER = { win: "bg-result-win", draw: "bg-result-draw", loss: "bg-result-loss" };

export function GamesTable({
  games,
  count,
  page,
  fideId,
  basePath,
}: {
  games: PublicGame[];
  count: number;
  page: number;
  fideId: string;
  basePath: string;
}) {
  const pages = Math.max(1, Math.ceil(count / GAMES_PAGE_SIZE));
  const href = (p: number) => (p === 1 ? `${basePath}#games` : `${basePath}?page=${p}#games`);

  return (
    <div className="flex flex-col gap-4">
      {/* Phones: one game per block. A five-column table at 360px either
          scrolls sideways or crushes names into three lines each. */}
      <ul className="flex flex-col divide-y divide-ink-line/60 sm:hidden">
        {games.map((g) => {
          const o = outcome(g, fideId);
          return (
            <li key={g.publicId} className="flex flex-col gap-1.5 py-3 text-[14px] text-ink-muted">
              <div className="flex items-center justify-between gap-3 text-[12px] text-ink-faint">
                <span className="tabular-nums">{formatDate(g.date)}</span>
                <span className="inline-flex items-center gap-2 tabular-nums text-ink-text">
                  {o && <span className={`h-2 w-2 rounded-full ${MARKER[o]}`} aria-label={o} />}
                  {RESULT_LABEL[g.result]}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-ink-faint bg-ink-text" aria-label="White" />
                <Side name={g.whiteName} elo={g.whiteElo} profile={g.white} self={g.white?.fideId === fideId} />
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-ink-faint bg-ink-canvas" aria-label="Black" />
                <Side name={g.blackName} elo={g.blackElo} profile={g.black} self={g.black?.fideId === fideId} />
              </div>
              <p className="text-[12px] text-ink-faint">
                {[g.event, g.round && `Round ${g.round}`, g.openingName].filter(Boolean).join(" · ")}
              </p>
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-[14px]">
          <thead>
            <tr className="border-b border-ink-line text-[12px] uppercase tracking-[0.06em] text-ink-faint">
              <th scope="col" className="py-3 pr-3 font-[520]">Date</th>
              <th scope="col" className="px-3 py-3 font-[520]">White</th>
              <th scope="col" className="px-3 py-3 font-[520]">Result</th>
              <th scope="col" className="px-3 py-3 font-[520]">Black</th>
              <th scope="col" className="py-3 pl-3 font-[520]">Event</th>
            </tr>
          </thead>
          <tbody className="text-ink-muted">
            {games.map((g) => {
              const o = outcome(g, fideId);
              return (
                <tr key={g.publicId} className="border-b border-ink-line/60 align-top">
                  <td className="whitespace-nowrap py-3 pr-3 tabular-nums text-ink-faint">{formatDate(g.date)}</td>
                  <td className="px-3 py-3">
                    <Side name={g.whiteName} elo={g.whiteElo} profile={g.white} self={g.white?.fideId === fideId} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className="inline-flex items-center gap-2 tabular-nums text-ink-text">
                      {o && <span className={`h-2 w-2 rounded-full ${MARKER[o]}`} aria-label={o} />}
                      {RESULT_LABEL[g.result]}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <Side name={g.blackName} elo={g.blackElo} profile={g.black} self={g.black?.fideId === fideId} />
                  </td>
                  <td className="py-3 pl-3">
                    <span className="line-clamp-1">{g.event}</span>
                    {(g.openingName || g.round) && (
                      <span className="block text-[12px] text-ink-faint">
                        {[g.round && `Round ${g.round}`, g.openingName].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav className="flex items-center justify-between text-[14px]" aria-label="Games pages">
          {page > 1 ? (
            <Link href={href(page - 1)} rel="prev" className="rounded-pill bg-ink-raised px-4 py-2 hover:bg-ink-line">
              Newer games
            </Link>
          ) : (
            <span />
          )}
          <span className="tabular-nums text-ink-faint">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link href={href(page + 1)} rel="next" className="rounded-pill bg-ink-raised px-4 py-2 hover:bg-ink-line">
              Older games
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
