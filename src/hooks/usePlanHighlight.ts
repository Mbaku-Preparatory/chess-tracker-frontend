"use client";

import { useState, type FocusEvent } from "react";

/** The plan that carries the "Most popular" badge and is highlighted until
 * the visitor points at another. Shared by /subscribe and /pricing. */
export const POPULAR_PERIOD = "year";
export const POPULAR_LABEL = "Most popular";

/**
 * Which plan card is highlighted: the popular one, unless the pointer (or the
 * keyboard focus) is on another card, which then takes the highlight. Leaving
 * the grid hands it back.
 *
 *   const { isHighlighted, cardProps, gridProps } = usePlanHighlight(periods);
 *   <div {...gridProps}>{plans.map(p => <Card {...cardProps(p.period)} highlighted={isHighlighted(p.period)} />)}</div>
 */
export function usePlanHighlight(periods: string[]) {
  const [pointed, setPointed] = useState<string | null>(null);
  const fallback = periods.includes(POPULAR_PERIOD) ? POPULAR_PERIOD : (periods[0] ?? null);
  const highlighted = pointed ?? fallback;

  return {
    isHighlighted: (period: string) => period === highlighted,
    cardProps: (period: string) => ({
      onMouseEnter: () => setPointed(period),
      onFocus: () => setPointed(period),
    }),
    gridProps: {
      onMouseLeave: () => setPointed(null),
      // Only when focus leaves the grid, not when it moves between cards.
      onBlur: (e: FocusEvent<HTMLElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPointed(null);
      },
    },
  };
}
