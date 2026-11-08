import Link from "next/link";

import { TYPES } from "@/lib/chessPersonality";

import { Emblem } from "./Emblem";

/** All sixteen, each linking to its page. `current` is left out of the grid's links but kept in place. */
export function TypeGrid({ current }: { current?: string }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {TYPES.map((t) => (
        <li key={t.slug}>
          <Link
            href={`/chess-personality/${t.slug}`}
            aria-current={t.slug === current ? "page" : undefined}
            className={`flex h-full flex-col items-center gap-3 rounded-xl p-5 text-center transition-colors ${
              t.slug === current ? "bg-accent/10 ring-1 ring-accent/40" : "bg-ink-card hover:bg-ink-raised"
            }`}
          >
            <Emblem type={t} size={64} />
            <span className="text-[16px] font-[480] leading-tight">{t.name}</span>
            <span className="hidden text-[13px] leading-[1.4] text-ink-muted sm:block">{t.tagline}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
