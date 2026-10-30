"use client";

import { useEffect, useState } from "react";

import { Avatar } from "@/components/avatar/Avatar";

export interface Speech {
  /** A new id is a new remark: the bubble pops in again and retypes. */
  id: number;
  text: string;
  /** "View game" for one of their games, opened in a new tab. */
  link?: { href: string; label: string };
}

/** A move the bot could have played instead, offered as a button. */
export interface SpeechChoice {
  san: string;
  /** Games of theirs that played it. */
  count: number;
  onPick: () => void;
}

/** Milliseconds per character: quick enough to read along, slow enough to see. */
const TYPE_MS = 16;

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The bot talking, as chess.com's coach does: its avatar beside a speech
 * bubble that pops in and types the remark out. Screen readers get the whole
 * remark at once from the hidden copy, not every letter.
 */
export function BotSpeech({
  avatar,
  name,
  speech,
  choices = [],
}: {
  avatar: string;
  name: string;
  speech: Speech;
  /** Its other moves here, while you can still ask for one. */
  choices?: SpeechChoice[];
}) {
  const [shown, setShown] = useState(speech.text.length);

  useEffect(() => {
    if (reducedMotion()) return setShown(speech.text.length);
    setShown(0);
    const timer = setInterval(() => {
      setShown((n) => {
        if (n >= speech.text.length) {
          clearInterval(timer);
          return n;
        }
        return n + 1;
      });
    }, TYPE_MS);
    return () => clearInterval(timer);
  }, [speech.id, speech.text]);

  const typing = shown < speech.text.length;

  return (
    <div className="flex items-start gap-3">
      <div className={`shrink-0 ${typing ? "bot-talk" : ""}`}>
        <Avatar src={avatar} size={56} className="ring-2 ring-ink-card" />
      </div>
      <div key={speech.id} className="bubble-in relative min-w-0 flex-1 rounded-2xl bg-ink-raised px-3.5 py-2.5">
        {/* The bubble's tail, pointing at the avatar. */}
        <span aria-hidden className="absolute -left-1.5 top-5 h-3 w-3 rotate-45 bg-ink-raised" />
        <p className="relative text-[14px] leading-snug text-ink-text">
          <span aria-hidden>
            {speech.text.slice(0, shown)}
            {typing && <span className="ml-px inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-ink-muted" />}
          </span>
          <span className="sr-only" aria-live="polite">
            {name}: {speech.text}
          </span>
        </p>
        {speech.link && !typing && (
          <a
            href={speech.link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="link-in relative mt-2 inline-flex items-center gap-1 rounded-pill bg-accent px-3 py-1 text-[13px] font-[520] text-accent-on hover:opacity-90"
          >
            {speech.link.label}
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5h5v5M19 5l-8 8M10 7H6a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1v-4" />
            </svg>
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        )}
        {choices.length > 0 && !typing && (
          <div role="group" aria-label="Play another move instead" className="link-in relative mt-2 flex flex-wrap gap-1.5">
            {choices.map((c) => (
              <button
                key={c.san}
                type="button"
                onClick={c.onPick}
                title={`Play ${c.san} instead (${c.count} ${c.count === 1 ? "game" : "games"})`}
                className="inline-flex items-baseline gap-1 rounded-pill border border-accent/60 px-2.5 py-0.5 text-[13px] font-[520] text-accent-soft hover:bg-accent hover:text-accent-on"
              >
                {c.san}
                <span className="text-[11px] font-normal opacity-70">{c.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
