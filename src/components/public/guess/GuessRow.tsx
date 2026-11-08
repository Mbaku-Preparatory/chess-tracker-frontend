import Link from "next/link";

import { federationFor } from "@/lib/federations";
import { ALIASES, feedbackFor, type Clue, type PoolPlayer } from "@/lib/guessThePlayer";
import { profilePath } from "@/lib/publicPlayer";

const TILE: Record<Clue["mark"], string> = {
  hit: "bg-[#2f9e44] text-white",
  close: "bg-[#e8a400] text-white",
  miss: "bg-[#c92a2a]/85 text-white",
};
const ARROW = { up: "↑", down: "↓" } as const;

function Tile({ clue, children, hint, shown, focus }: { clue: Clue; children: React.ReactNode; hint: string; shown: boolean; focus: boolean }) {
  if (!shown) return <div aria-hidden className="h-14 rounded-lg border border-dashed border-ink-line bg-ink-card" />;
  return (
    <div
      className={`flex h-14 animate-tile-flip flex-col items-center justify-center rounded-lg text-center text-[15px] font-[600] tabular-nums leading-tight transition-shadow ${TILE[clue.mark]} ${
        focus ? "ring-[3px] ring-ink-text ring-offset-2 ring-offset-ink-canvas" : ""
      }`}
      title={hint}
    >
      <span>
        {children}
        {clue.direction && <span aria-hidden> {ARROW[clue.direction]}</span>}
      </span>
      <span className="sr-only">{hint}</span>
    </div>
  );
}

function numberHint(label: string, clue: Clue, up: string, down: string) {
  if (clue.mark === "hit") return `${label}: exactly right`;
  const near = clue.mark === "close" ? "close. " : "";
  return `${label}: ${near}${clue.direction === "up" ? up : down}`;
}

/**
 * One guess and its four clues: federation, title, rating, born. Used by the
 * game and by its demo, which reveals the tiles one at a time (`shown`) and
 * rings the one its caption is about (`focus`).
 */
export function GuessRow({
  guess,
  answer,
  shown = 4,
  focus = null,
  linked = true,
}: {
  guess: PoolPlayer;
  answer: PoolPlayer;
  shown?: number;
  focus?: number | null;
  linked?: boolean;
}) {
  const f = feedbackFor(guess, answer);
  const fed = federationFor(guess.federation);
  const name = (
    <>
      {guess.name}
      {ALIASES[guess.fideId] && <span className="ml-1.5 font-normal text-ink-muted">({ALIASES[guess.fideId]})</span>}
    </>
  );
  const at = (i: number) => ({ shown: i < shown, focus: focus === i });
  return (
    <li className="flex flex-col gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_repeat(4,92px)] sm:items-center sm:gap-2">
      {linked ? (
        <Link href={profilePath(guess)} className="truncate text-[16px] font-[480] hover:text-accent-soft" title={`${guess.name}'s profile`}>
          {name}
        </Link>
      ) : (
        <span className="truncate text-[16px] font-[480]">{name}</span>
      )}
      <div className="grid grid-cols-4 gap-2 sm:contents">
        <Tile clue={f.federation} {...at(0)} hint={`Federation: ${f.federation.mark === "hit" ? "same" : f.federation.mark === "close" ? "same continent" : "different"}`}>
          <span className="block text-[18px] leading-none">{fed.flag || ""}</span>
          <span className="text-[13px]">{guess.federation}</span>
        </Tile>
        <Tile clue={f.title} {...at(1)} hint={`Title: ${f.title.mark === "hit" ? "same" : "different"}`}>
          {guess.title || "—"}
        </Tile>
        <Tile clue={f.rating} {...at(2)} hint={numberHint("Rating", f.rating, "the mystery player is rated higher", "the mystery player is rated lower")}>
          {guess.rating}
        </Tile>
        <Tile clue={f.born} {...at(3)} hint={numberHint("Born", f.born, "the mystery player was born later", "the mystery player was born earlier")}>
          {guess.born}
        </Tile>
      </div>
    </li>
  );
}
