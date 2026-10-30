"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { formatGameDate, type GameRow, type GameSide } from "@/lib/games";

/**
 * A list of games, the same on a public profile and in the app. Rows come
 * from lib/games.ts (rowFromPublicGame, rowFromGame); paging is Pagination's.
 */

const RESULT_LABEL: Record<GameRow["result"], string> = {
  "1-0": "1–0",
  "0-1": "0–1",
  "1/2-1/2": "½–½",
  "*": "*",
};

const MARKER = { win: "bg-result-win", draw: "bg-result-draw", loss: "bg-result-loss" };

/** A click anywhere on a row opens the game, except on a link or a button,
 * which do what they say. */
function onRowClick(row: GameRow, open: (path: string) => void) {
  return (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a, button")) return;
    if (row.href) open(row.href);
  };
}

/** A side of a game: a link when we know whose profile it is. */
function Side({ side }: { side: GameSide }) {
  const label = (
    <>
      <span className={side.self ? "text-ink-text" : ""}>{side.name}</span>
      {side.elo != null && <span className="ml-1.5 tabular-nums text-ink-faint">{side.elo}</span>}
    </>
  );
  if (side.href) {
    return (
      <Link href={side.href} className="hover:text-accent-soft">
        {label}
      </Link>
    );
  }
  return label;
}

/** The result, with the player's outcome as a coloured dot; the game's link
 * when it has moves, so a keyboard or screen reader can open it too. */
function Result({ row, phone }: { row: GameRow; phone?: boolean }) {
  const dot = row.outcome && (
    <span className={`h-2 w-2 rounded-full ${MARKER[row.outcome]}`} aria-hidden={row.href ? true : undefined} aria-label={row.href ? undefined : row.outcome} />
  );
  if (!row.href) {
    return (
      <span className="inline-flex items-center gap-2 tabular-nums text-ink-text">
        {dot}
        {RESULT_LABEL[row.result]}
      </span>
    );
  }
  return (
    <Link
      href={row.href}
      aria-label={`View ${row.white.name} against ${row.black.name}, ${RESULT_LABEL[row.result]}`}
      className={`inline-flex items-center gap-2 rounded-pill px-2 py-0.5 tabular-nums text-ink-text hover:bg-ink-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${phone ? "" : "-mx-2"}`}
    >
      {dot}
      {RESULT_LABEL[row.result]}
      {phone && <span className="text-accent-soft">View</span>}
    </Link>
  );
}

export function GamesTable({
  rows,
  rowAction,
}: {
  rows: GameRow[];
  /** One more control per row, such as the app's delete button. */
  rowAction?: (row: GameRow) => React.ReactNode;
}) {
  const router = useRouter();
  const date = (row: GameRow) => formatGameDate(row.date) ?? "—";

  return (
    <>
      {/* Phones: one game per block. A five-column table at 360px either
          scrolls sideways or crushes names into three lines each. */}
      <ul className="flex flex-col divide-y divide-ink-line/60 sm:hidden">
        {rows.map((row) => (
          <li
            key={row.key}
            onClick={onRowClick(row, router.push)}
            className={`flex flex-col gap-1.5 py-3 text-[14px] text-ink-muted ${row.href ? "cursor-pointer" : ""}`}
          >
            <div className="flex items-center justify-between gap-3 text-[12px] text-ink-faint">
              <span className="tabular-nums">{date(row)}</span>
              <span className="flex items-center gap-1">
                <Result row={row} phone />
                {rowAction?.(row)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-ink-faint bg-white" aria-label="White" />
              <Side side={row.white} />
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-ink-faint bg-neutral-900" aria-label="Black" />
              <Side side={row.black} />
            </div>
            <p className="text-[12px] text-ink-faint">{[row.event, row.round && `Round ${row.round}`, row.opening].filter(Boolean).join(" · ")}</p>
          </li>
        ))}
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
              {rowAction && <th scope="col" className="w-px py-3 pl-3"><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody className="text-ink-muted">
            {rows.map((row) => (
              <tr
                key={row.key}
                onClick={onRowClick(row, router.push)}
                className={`border-b border-ink-line/60 align-top ${row.href ? "cursor-pointer hover:bg-ink-raised/50" : ""}`}
              >
                <td className="whitespace-nowrap py-3 pr-3 tabular-nums text-ink-faint">{date(row)}</td>
                <td className="px-3 py-3">
                  <Side side={row.white} />
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  <Result row={row} />
                </td>
                <td className="px-3 py-3">
                  <Side side={row.black} />
                </td>
                <td className="py-3 pl-3">
                  <span className="line-clamp-1">{row.event}</span>
                  {(row.opening || row.round) && (
                    <span className="block text-[12px] text-ink-faint">{[row.round && `Round ${row.round}`, row.opening].filter(Boolean).join(" · ")}</span>
                  )}
                </td>
                {rowAction && <td className="whitespace-nowrap py-2 pl-3 text-right">{rowAction(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
