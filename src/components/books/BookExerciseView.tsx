"use client";

import { useEffect, useState } from "react";

import { AnalysisView } from "@/components/analysis/AnalysisView";
import { userMessage } from "@/lib/apiError";
import { getBookExercise, type ExerciseWithBook } from "@/lib/books";
import { pgnFilename } from "@/lib/chess/pgn";

/**
 * One exercise of a book, to solve: the position from the diagram, the side
 * to move at the bottom, and the book's solution and notes once it is solved
 * or given up. The same in the app and in the guest trial (with `guestKey`);
 * each says where the book and its other exercises live.
 */
export function BookExerciseView({
  publicId,
  number,
  guestKey,
  bookHref,
  hrefFor,
}: {
  publicId: string;
  number: number;
  guestKey?: string;
  bookHref: string;
  hrefFor: (number: number) => string;
}) {
  const [data, setData] = useState<ExerciseWithBook | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    getBookExercise(publicId, number, guestKey)
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(userMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [publicId, number, guestKey]);

  if (error) return <p className="py-16 text-center text-[15px] text-ink-faint">{error}</p>;
  if (!data) return <div className="mx-auto aspect-square w-full max-w-[640px] animate-pulse rounded-xl bg-ink-raised" />;
  const e = data.exercise;
  if (!e) return <p className="py-16 text-center text-[15px] text-ink-faint">This exercise was not found.</p>;

  const at = data.numbers.indexOf(e.number);
  const link = (i: number) => (i >= 0 && i < data.numbers.length ? hrefFor(data.numbers[i]) : null);
  const toMove = e.fen.split(" ")[1] === "b" ? "black" : "white";
  const year = e.date.slice(0, 4).replace(/\?/g, "");

  return (
    <AnalysisView
      // A fresh board, line and solve state for each exercise.
      key={e.number}
      pgn={e.pgn}
      white={{ name: e.white || "White", rating: null, score: null }}
      black={{ name: e.black || "Black", rating: null, score: null }}
      orientation={toMove}
      result="*"
      title={`Exercise ${e.number}`}
      details={[data.title, e.white && e.black ? `${e.white} – ${e.black}` : null, e.event !== "?" ? e.event : null, year || null,
        !e.verified ? "The book's solution stops early here" : null]}
      filename={pgnFilename(e.white || "White", e.black || "Black", year || null, `exercise-${e.number}`)}
      shareUrl={null}
      importToLichess
      back={{ href: bookHref }}
      solve
      pager={{ label: `${at + 1} of ${data.numbers.length}`, prev: link(at - 1), next: link(at + 1) }}
    />
  );
}
