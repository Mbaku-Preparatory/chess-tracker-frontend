"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  BY_SLUG,
  decodeScores,
  readMyResult,
  resultPath,
  typeFor,
  typicalScores,
  type Scores,
} from "@/lib/chessPersonality";

import { ShareResult } from "./ShareResult";
import { Sliders } from "./Sliders";

/**
 * The parts of a type page that depend on the link and on this browser. The
 * page itself is static (one per type, built once), so these read ?s= on the
 * client rather than making the server render per visit.
 *
 *  - Opened from your own quiz, or your own shared link: "You are".
 *  - Someone else's link (?s= that isn't your last result): "Your friend is".
 *  - No ?s=: just the type, with typical sliders.
 */
type View = { scores: Scores; whose: "mine" | "friend" | "none" };

function useView(slug: string): View | null {
  const type = BY_SLUG.get(slug)!;
  const params = useSearchParams();
  const [view, setView] = useState<View | null>(null);
  useEffect(() => {
    const linked = decodeScores(params.get("s"));
    // A doctored ?s= that names a different type is ignored, not shown.
    const scores = linked && typeFor(linked) === type ? linked : null;
    const mine = readMyResult();
    if (!scores) setView({ scores: typicalScores(type), whose: "none" });
    else setView({ scores, whose: mine && mine.type === type && mine.scores.join() === scores.join() ? "mine" : "friend" });
  }, [params, type]);
  return view;
}

export function ResultEyebrow({ slug }: { slug: string }) {
  const view = useView(slug);
  const text = view?.whose === "mine" ? "You are" : view?.whose === "friend" ? "Your friend is" : "Chess personality";
  return <p className="text-[13px] uppercase tracking-[0.12em] text-accent-soft">{text}</p>;
}

export function ResultSliders({ slug }: { slug: string }) {
  const type = BY_SLUG.get(slug)!;
  const view = useView(slug);
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[13px] uppercase tracking-[0.1em] text-ink-muted">
        {view?.whose === "mine" ? "Your answers" : view?.whose === "friend" ? "Their answers" : "How they play"}
      </h2>
      <Sliders scores={view?.scores ?? typicalScores(type)} colour={type.colour} />
    </div>
  );
}

export function ResultActions({ slug }: { slug: string }) {
  const type = BY_SLUG.get(slug)!;
  const view = useView(slug);
  const mine = view?.whose === "mine";
  const path = view && view.whose !== "none" ? resultPath(type, view.scores) : resultPath(type);
  return (
    <div className="flex flex-col gap-5">
      <ShareResult type={type} path={path} mine={mine} />
      <Link
        href="/chess-personality/quiz"
        className="self-start text-[15px] text-ink-muted underline decoration-ink-line underline-offset-4 hover:text-ink-text"
      >
        {mine ? "Take the test again" : view?.whose === "friend" ? "Find out yours: take the test" : "Take the test"}
      </Link>
    </div>
  );
}
