"use client";

import { useEffect, useRef } from "react";

import type { ParsedMove } from "@/lib/chess/types";
import type { AnalysisLine } from "@/lib/chess/useAnalysisLine";

/**
 * The game as a numbered two-column list, the way Chess.com shows it, with the
 * line you tried indented under the move it replaced. Both stay clickable: the
 * game is never hidden behind the variation, so there is no "back to the game"
 * to find.
 */
export function MoveList({ mainMoves, line, result }: { mainMoves: ParsedMove[]; line: AnalysisLine; result: string | null }) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const startsAt = line.branchStartsAt;

  // Keep the current move in sight by scrolling the list's own box, never the
  // page: scrollIntoView scrolls every scrollable ancestor, so on a phone,
  // where the list sits below the board, each Next nudged the whole page.
  useEffect(() => {
    const el = activeRef.current;
    const box = el?.closest<HTMLElement>("[data-moves-scroll]");
    if (!el || !box) return;
    const e = el.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    if (e.top < b.top) box.scrollTop -= b.top - e.top + 4;
    else if (e.bottom > b.bottom) box.scrollTop += e.bottom - b.bottom + 4;
  }, [line.index, line.onBranch]);

  // A move of the game is current when the board is on it: on the game, or
  // on the branch's stretch of the game before the branch leaves it.
  const mainActive = (i: number) => line.index === i && (!line.onBranch || (startsAt !== null && i < startsAt));
  const branchActive = (i: number) => line.onBranch && line.index === i;

  const rows: { number: number; white: number | null; black: number | null }[] = [];
  mainMoves.forEach((m, i) => {
    if (m.color === "w" || rows.length === 0) rows.push({ number: m.moveNumber, white: null, black: null });
    rows[rows.length - 1][m.color === "w" ? "white" : "black"] = i;
  });

  // The variation sits under the row of the move it replaced, or after the
  // last row when it continues past the end of the game.
  const replacedRow = rows.findIndex((r) => r.white === startsAt || r.black === startsAt);
  const variationRow = !line.branch ? -1 : replacedRow >= 0 ? replacedRow : rows.length - 1;

  const cell = (i: number | null) =>
    i === null ? (
      <span className="flex-1" />
    ) : (
      <button
        type="button"
        ref={mainActive(i) ? activeRef : null}
        onClick={() => line.selectMain(i)}
        className={`flex-1 rounded px-2 py-1 text-left ${mainActive(i) ? "bg-accent text-accent-on" : "text-ink-text hover:bg-ink-raised"}`}
      >
        {mainMoves[i].san}
      </button>
    );

  const variation = line.branch && startsAt !== null && (
    <div className="my-1 ml-10 flex flex-wrap items-baseline gap-x-1 border-l-2 border-accent/60 py-1 pl-3 text-[13px]">
      {line.branch.moves.map((m, k) => {
        const i = startsAt + k;
        const label = m.color === "w" ? `${m.moveNumber}.` : k === 0 ? `${m.moveNumber}…` : null;
        return (
          <span key={i} className="inline-flex items-baseline">
            {label && <span className="mr-0.5 text-ink-faint">{label}</span>}
            <button
              type="button"
              ref={branchActive(i) ? activeRef : null}
              onClick={() => line.selectBranch(i)}
              className={`rounded px-1 py-0.5 ${branchActive(i) ? "bg-accent text-accent-on" : "text-accent-soft hover:bg-ink-raised"}`}
            >
              {m.san}
            </button>
          </span>
        );
      })}
    </div>
  );

  if (mainMoves.length === 0 && !line.branch) {
    return <p className="py-6 text-center text-[14px] text-ink-faint">No moves recorded for this game.</p>;
  }

  return (
    <div className="font-mono text-[14px]">
      {rows.length === 0 && variation}
      {rows.map((r, n) => (
        <div key={n}>
          <div className={`flex items-center gap-1 rounded ${n % 2 ? "" : "bg-ink-raised/40"}`}>
            <span className="w-10 shrink-0 pl-2 text-ink-faint">{r.number}.</span>
            {r.white === null ? <span className="flex-1 px-2 py-1 text-ink-faint">…</span> : cell(r.white)}
            {cell(r.black)}
          </div>
          {n === variationRow && variation}
        </div>
      ))}
      {result && <p className="py-2 text-center font-[520] text-ink-text">{result.replaceAll("1/2", "½")}</p>}
    </div>
  );
}
