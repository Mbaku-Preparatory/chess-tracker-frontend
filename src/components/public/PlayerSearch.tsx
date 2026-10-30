"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { federationFor } from "@/lib/federations";
import { profilePath, titledName } from "@/lib/publicPlayer";
import { searchPublicPlayers, type PlayerSearchResult } from "@/lib/publicGraphql";

type Status =
  | { kind: "idle" }
  | { kind: "searching" }
  | { kind: "results" }
  | { kind: "empty"; query: string }
  | { kind: "error"; message: string };

const DEBOUNCE_MS = 200;
// The backend needs a word of three letters before it searches; asking with
// less only costs a request that comes back empty.
const searchable = (q: string) => /\d/.test(q) ? /^\d{3,}$/.test(q.trim()) : /[\p{L}]{3,}/u.test(q);

function rating(r: PlayerSearchResult): string | null {
  if (r.standardRating) return `${r.standardRating}`;
  if (r.rapidRating) return `${r.rapidRating} rapid`;
  if (r.blitzRating) return `${r.blitzRating} blitz`;
  return null;
}

/**
 * Find a player by name or FIDE ID: suggestions as you type, then straight to
 * the profile.
 *
 * An ARIA combobox: arrow keys move through the suggestions, Enter opens the
 * highlighted one (or the first, or the FIDE ID typed), Escape closes them,
 * and a screen reader hears how many were found. Replies are matched to the
 * query that asked for them, so a slow answer for "carl" cannot replace the
 * list for "carlsen".
 *
 * With `onPick`, choosing a player hands them over instead of opening their
 * profile (the bot page builds a bot from them).
 */
export function PlayerSearch({
  onPick,
  placeholder = "Search by name or FIDE ID",
  buttonLabel = "Search",
}: {
  onPick?: (player: PlayerSearchResult) => void;
  placeholder?: string;
  buttonLabel?: string;
} = {}) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerSearchResult[]>([]);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const latest = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (!searchable(q)) {
      latest.current += 1;
      setResults([]);
      setStatus({ kind: "idle" });
      return;
    }
    const ticket = ++latest.current;
    setStatus({ kind: "searching" });
    const timer = setTimeout(async () => {
      try {
        const found = await searchPublicPlayers(q);
        if (ticket !== latest.current) return; // a newer query has been asked
        setResults(found);
        setActive(found.length ? 0 : -1);
        setStatus(found.length ? { kind: "results" } : { kind: "empty", query: q });
      } catch (err) {
        if (ticket !== latest.current) return;
        setResults([]);
        setStatus({ kind: "error", message: err instanceof Error ? err.message : "Search is unavailable right now. Try again shortly." });
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  function go(result: PlayerSearchResult) {
    setOpen(false);
    if (onPick) onPick(result);
    else router.push(profilePath(result));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (open && results[active]) return go(results[active]);
    // A FIDE ID needs no search: the profile page corrects the name part.
    if (/^\d{3,10}$/.test(q) && !onPick) return router.push(`/player/player/${q}`);
    if (results[0]) return go(results[0]);
    if (!searchable(q)) setStatus({ kind: "error", message: "Type at least three letters of a name, or a FIDE ID." });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && results.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp" && results.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Escape" && showList) {
      // A search input clears itself on Escape, and the change would reopen
      // the list. First Escape closes the suggestions; a second one clears.
      e.preventDefault();
      setOpen(false);
    }
  }

  const showList = open && results.length > 0;
  const message =
    status.kind === "searching" ? "Searching…"
    : status.kind === "empty" ? `No rated player matches “${status.query}”.`
    : status.kind === "error" ? status.message
    : status.kind === "results" ? `${results.length} player${results.length === 1 ? "" : "s"} found`
    : "";

  return (
    <form onSubmit={submit} className="relative flex w-full max-w-[560px] flex-col gap-2" role="search">
      <label htmlFor={`${listId}-input`} className="sr-only">Player name or FIDE ID</label>
      <div className="flex">
        <input
          id={`${listId}-input`}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={`${listId}-list`}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${listId}-opt-${active}` : undefined}
          aria-describedby={`${listId}-status`}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 rounded-l-pill border border-r-0 border-ink-muted/60 bg-transparent px-5 py-3.5 text-[16px] text-ink-text placeholder:text-ink-faint focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          className="whitespace-nowrap rounded-r-pill bg-accent px-6 py-3.5 text-[16px] font-[480] text-accent-on hover:bg-accent-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {buttonLabel}
        </button>
      </div>

      {showList && (
        <ul
          id={`${listId}-list`}
          role="listbox"
          aria-label="Players"
          className="absolute left-0 right-0 top-[calc(100%-0.25rem)] z-30 mt-2 max-h-[420px] overflow-y-auto rounded-xl border border-ink-line bg-ink-card py-2 shadow-[0_12px_32px_rgb(0_0_0/0.25)]"
        >
          {results.map((r, i) => {
            const fed = federationFor(r.federation);
            const title = r.title || r.womenTitle;
            return (
              <li
                key={r.fideId}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                // mousedown, not click: click comes after the input's blur,
                // which has already closed the list.
                onMouseDown={(e) => {
                  e.preventDefault();
                  go(r);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center justify-between gap-4 px-4 py-2.5 ${i === active ? "bg-ink-raised" : ""}`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span aria-hidden="true" className="w-6 shrink-0 text-center">{fed.flag}</span>
                  <span className="min-w-0 truncate text-[15px] text-ink-text">
                    {title && <span className="mr-1.5 text-accent-soft">{title}</span>}
                    {r.fullName}
                  </span>
                  <span className="sr-only">{titledName(r)}, {fed.name}</span>
                </span>
                <span className="flex shrink-0 items-baseline gap-3 text-[13px] text-ink-faint">
                  <span className="hidden sm:inline">{fed.name}</span>
                  {rating(r) && <span className="tabular-nums text-ink-muted">{rating(r)}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <p
        id={`${listId}-status`}
        aria-live="polite"
        className={`min-h-[20px] text-[14px] ${status.kind === "error" ? "text-result-loss" : "text-ink-faint"} ${status.kind === "results" ? "sr-only" : ""}`}
      >
        {message}
      </p>
    </form>
  );
}
