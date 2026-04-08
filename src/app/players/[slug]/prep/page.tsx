"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { CommonMistakesCard } from "@/components/players/CommonMistakesCard";
import { GamesTable } from "@/components/players/GamesTable";
import { OpeningBreakdownCard } from "@/components/players/OpeningBreakdownCard";
import { PaymentModal } from "@/components/players/PaymentModal";
import { PerformanceSplitCard } from "@/components/players/PerformanceSplitCard";
import { QuickPrepCard } from "@/components/players/QuickPrepCard";
import { StrengthWeaknessCard } from "@/components/players/StrengthWeaknessCard";
import { TimePressureCard } from "@/components/players/TimePressureCard";
import { WinConditionCard } from "@/components/players/WinConditionCard";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { StatCard } from "@/components/ui/StatCard";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchPlayerDetail,
  fetchPlayerPrep,
} from "@/store/slices/playerDetailSlice";
import {
  checkAccess,
  loadPhoneFromStorage,
} from "@/store/slices/paymentSlice";
import type {
  OpeningStat,
  PlayerDetail,
  PrepData,
  ScoutingSection,
  ScoutingSectionType,
} from "@/types";

function getSurname(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] || name;
}

function formatPercent(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return "—";
  }

  return `${numericValue % 1 === 0 ? numericValue.toFixed(0) : numericValue.toFixed(1)}%`;
}

function getTopOpening(openings: OpeningStat[]): OpeningStat | null {
  return openings[0] ?? null;
}

function getScoutingSection(
  prepData: PrepData,
  player: PlayerDetail,
  type: ScoutingSectionType
): ScoutingSection | null {
  const existing = prepData.scouting_sections.find(
    (section) => section.section_type === type
  );

  if (existing) {
    return existing;
  }

  const playerName = getSurname(player.full_name);
  const summary = prepData.performance_summary ?? player.performance_summary;
  const whiteScore = Number(summary?.white_score ?? 0);
  const blackScore = Number(summary?.black_score ?? 0);
  const blackOpenings = player.opening_stats.filter((opening) => opening.color_choice === "black");

  if (type === "win_condition") {
    return {
      id: -1,
      section_type: type,
      title: "How You Beat This Player",
      order: 90,
      content: {
        intro: "Use the color split and opening evidence. Do not guess.",
        as_white: {
          heading: `If You Are White Against ${playerName}`,
          points: [
            "Avoid the Open Sicilian if you are not deeply prepared.",
            "Choose slower Anti-Sicilian, Closed Sicilian, or Maroczy-type structures.",
            "Do not hand over an easy ...d5 break that frees his pieces.",
            "Trade his dark-squared bishop when the position allows it.",
            "Keep the game under control and make him generate play from scratch.",
          ],
        },
        as_black: {
          heading: `If You Are Black Against ${playerName}`,
          points: [
            "Challenge his weaker White score with Slav, Semi-Slav, or QGD structures.",
            "Stay solid early and wait for overextension rather than forcing play.",
            "Punish premature kingside pawn pushes instead of reacting passively.",
            "If he cannot create tactical chaos, keep the position positional.",
            `Respect his best Black comfort zone: ${
              getTopOpening(blackOpenings)?.opening_name || "...g6 Sicilian structures"
            }.`,
          ],
        },
      },
    };
  }

  if (type === "common_mistakes") {
    return {
      id: -2,
      section_type: type,
      title: "Common Mistakes Against This Player",
      order: 91,
      content: {
        intro: "These are the positions that make his life easier.",
        avoid: [
          "Entering tactical complications just because they look active.",
          "Letting him reach his preferred ...g6 Sicilian rhythms without resistance.",
          "Resolving central tension too early and improving his pieces for free.",
          "Playing passively with Black and allowing him to dictate the game.",
        ],
        do_instead: [
          "Slow the game down and make him prove he can improve quietly.",
          "Choose structures where long-term weaknesses matter more than tactics.",
          `Remember the split: ${formatPercent(blackScore)} with Black, ${formatPercent(whiteScore)} with White.`,
          "Attack his comfort zone, not his reputation.",
        ],
      },
    };
  }

  if (type === "quick_prep") {
    return {
      id: -3,
      section_type: type,
      title: "30-Second Prep Mode",
      order: 92,
      content: {
        intro: "Read this right before round start.",
        bullets: [
          `Color split first: ${formatPercent(blackScore)} with Black vs ${formatPercent(whiteScore)} with White.`,
          "As White: avoid gifting him easy tactical Sicilian positions.",
          "As Black: stay solid and wait for overextension in his White setups.",
          "Trade the dark-squared bishop when it improves your control.",
          "If you are better, keep the game calm.",
        ],
      },
    };
  }

  if (type === "time_pressure") {
    return {
      id: -4,
      section_type: type,
      title: "When Things Get Messy",
      order: 93,
      content: {
        intro: "His tactical instincts improve when the position gets loose.",
        observations: [
          "Open, forcing positions suit him more than slow maneuvering.",
          "He is more convincing when he can attack with Black than when he must prove White advantage.",
          "If the game is calm, do not re-open it without a concrete reason.",
        ],
        takeaway:
          "Do not give him chaos for free. If you have the better position, keep it stable and make him defend.",
      },
    };
  }

  return null;
}

function ShareButton({
  slug,
  playerName,
  className = "btn-secondary text-sm inline-flex items-center gap-1.5",
}: {
  slug: string;
  playerName: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/players/${slug}/prep`;
    const text = `Mbaku Preparatory dossier for ${playerName}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: text, url });
        return;
      } catch {
        // Fallback to clipboard.
      }
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [slug, playerName]);

  return (
    <button onClick={handleShare} className={className}>
      {copied ? (
        <>
          <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Link copied
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Share Prep Link
        </>
      )}
    </button>
  );
}

export default function PrepPage() {
  const { slug } = useParams<{ slug: string }>();
  const dispatch = useAppDispatch();

  const { player, prepData, loading, prepLoading, error, prepError } = useAppSelector(
    (state) => state.playerDetail
  );
  const { accessMap, phoneNumber, loading: accessLoading } = useAppSelector(
    (state) => state.payment
  );
  const [showPayment, setShowPayment] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);

  const hasAccess = slug ? accessMap[slug] ?? false : false;

  useEffect(() => {
    dispatch(loadPhoneFromStorage());
  }, [dispatch]);

  useEffect(() => {
    if (slug) {
      dispatch(fetchPlayerDetail(slug));
    }
  }, [dispatch, slug]);

  useEffect(() => {
    if (slug && phoneNumber) {
      dispatch(checkAccess({ slug, phone: phoneNumber })).finally(() => {
        setAccessChecked(true);
      });
      return;
    }

    setAccessChecked(true);
  }, [dispatch, phoneNumber, slug]);

  useEffect(() => {
    if (slug && hasAccess && phoneNumber) {
      dispatch(fetchPlayerPrep({ slug, phone: phoneNumber }));
    }
  }, [dispatch, hasAccess, phoneNumber, slug]);

  if (loading || !accessChecked || accessLoading) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-xl font-semibold text-gray-900">
          {error || "Player not found"}
        </h2>
        <Link href="/players" className="btn-primary mt-4 inline-flex">
          Back to players
        </Link>
      </div>
    );
  }

  const summary = player.performance_summary;
  const playerName = player.full_name;
  const surname = getSurname(playerName);
  const whiteScore = Number(summary?.white_score ?? 0);
  const blackScore = Number(summary?.black_score ?? 0);
  const whiteOpenings = player.opening_stats.filter((opening) => opening.color_choice === "white");
  const blackOpenings = player.opening_stats.filter((opening) => opening.color_choice === "black");
  const strongestBlackOpening = getTopOpening(blackOpenings);
  const weakestWhiteSignal = player.weaknesses[0]?.title || `Only ${formatPercent(summary?.white_score)} with White`;
  const prepPriority = player.prep_recommendations[0]?.scenario_title || "Deny tactical chaos and keep the game structured.";

  const lockedPreview = [
    {
      label: "PREP PRIORITY",
      title: prepPriority,
      body: player.prep_recommendations[0]?.description || "Make him prove he can win without tactical freedom.",
    },
    {
      label: "WEAKNESS",
      title: weakestWhiteSignal,
      body: `${surname} scores ${formatPercent(summary?.white_score)} when he has White in the recovered sample.`,
    },
    {
      label: "COMFORT ZONE",
      title:
        player.strengths[0]?.title ||
        `${surname} is more dangerous with Black than White.`,
      body:
        strongestBlackOpening?.opening_name ||
        "His best results come from dynamic Black setups.",
    },
    {
      label: "OPENING WARNING",
      title:
        strongestBlackOpening
          ? `${strongestBlackOpening.eco_code} ${strongestBlackOpening.opening_name}`
          : "Do not drift into his best Sicilian structures.",
      body: "This is the kind of position you want to deny before the middlegame starts.",
    },
  ];

  if (!hasAccess) {
    return (
      <div className="py-10">
        <div className="relative overflow-hidden rounded-[32px] border border-slate-800 bg-[radial-gradient(circle_at_top,_rgba(12,147,231,0.18),_transparent_36%),linear-gradient(180deg,#020617_0%,#0f172a_52%,#111827_100%)] text-white shadow-2xl">
          <div className="relative px-6 py-8 sm:px-10 sm:py-10">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Paid Dossier</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Instant Unlock</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Based on {summary?.total_games ?? player.recent_games.length} games
              </span>
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-200">
                  {surname} Preparatory
                </p>
                <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
                  Walk in with the plan before {surname} sits down.
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                  This is not a course. It is the paid scouting brief that tells you where
                  {` `}
                  {surname} is comfortable, where he breaks, and what your win conditions are
                  with White and Black.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setShowPayment(true)}
                    className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-400"
                  >
                    Unlock {surname} Prep — KES 10
                  </button>
                  <Link
                    href={`/players/${player.slug}`}
                    className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                  >
                    Back to profile
                  </Link>
                </div>

                <p className="mt-3 text-sm text-slate-400">
                  One payment. Tied to your phone number. Re-open it every time you face this player.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Used by players preparing for tournaments.{" "}
                  <button
                    onClick={() => setShowPayment(true)}
                    className="underline underline-offset-2 hover:text-slate-300"
                  >
                    Already paid? Enter your number to re-unlock.
                  </button>
                </p>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
                      Unlock Price
                    </p>
                    <p className="mt-2 text-4xl font-bold text-white">KES 10</p>
                  </div>
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200">
                      Perceived Value
                    </p>
                    <p className="mt-1 text-sm font-medium text-amber-50">
                      One accurate pairing is worth far more than KES 10.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-red-400/15 bg-red-400/10 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-red-200">
                      Weakness
                    </p>
                    <p className="mt-2 text-3xl font-bold text-white">
                      {formatPercent(summary?.white_score)}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      Score when {surname} has White.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/10 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
                      Comfort Zone
                    </p>
                    <p className="mt-2 text-3xl font-bold text-white">
                      {formatPercent(summary?.black_score)}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      Score when {surname} has Black.
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-200">
                    Urgency
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    If you get paired against {surname} today, this is the shortest path from
                    “I know his name” to “I know how I win.”
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-2">
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-200">
                  Before You Sit Down
                </p>
                <h2 className="mt-3 text-2xl font-bold text-white">
                  The entire case starts with the color split.
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {surname} is materially less convincing with White than with Black. That tells
                  you exactly where to press and exactly which structures to deny.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      White Score
                    </p>
                    <p className="mt-2 text-2xl font-bold text-white">{formatPercent(summary?.white_score)}</p>
                    <p className="mt-2 text-sm text-slate-300">
                      This is where the cleanest practical edge appears.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Black Score
                    </p>
                    <p className="mt-2 text-2xl font-bold text-white">{formatPercent(summary?.black_score)}</p>
                    <p className="mt-2 text-sm text-slate-300">
                      Respect this comfort zone and avoid drifting into it casually.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-200">
                  What&apos;s Inside
                </p>
                <div className="mt-4 space-y-3">
                  {[
                    ["PREP PRIORITY", "How you beat this player with White and Black"],
                    ["WEAKNESS", "Common mistakes to avoid before the middlegame starts"],
                    ["COMFORT ZONE", "Opening families and positions he actually wants"],
                    ["30-SECOND PREP", "A last-look checklist before you sit down"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                        {label}
                      </p>
                      <p className="text-right text-sm font-medium text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[28px] border border-brand-400/15 bg-brand-500/10 px-6 py-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-200">
                This Is Not a Course
              </p>
              <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
                It is prep. Built for the round you actually care about.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">
                No filler. No generic chess tips. Just the dossier that answers one question:
                what gives you the best practical chance to beat {surname} over the board?
              </p>
            </div>

            <div className="mt-10 rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-200">
                    Free Preview
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-white">
                    A glimpse of the dossier you unlock.
                  </h2>
                </div>
                <p className="text-sm text-slate-400">
                  The top of the report is visible. The payoff is behind the unlock.
                </p>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {lockedPreview.map((item, index) => {
                  const isBlurred = index > 1;

                  return (
                    <div
                      key={item.label}
                      className={`relative rounded-2xl border border-white/10 bg-slate-950/60 p-5 ${
                        isBlurred ? "overflow-hidden" : ""
                      }`}
                    >
                      <div className={isBlurred ? "select-none blur-[6px]" : ""}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                          {item.label}
                        </p>
                        <h3 className="mt-3 text-lg font-semibold text-white">{item.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p>
                      </div>
                      {isBlurred && (
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/35 to-slate-950/80" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-white/10 bg-slate-950/50 px-6 py-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-200">
                  Final Call
                </p>
                <h2 className="mt-2 text-xl font-bold text-white">
                  Search your opponent. Buy the prep. Walk in ready.
                </h2>
              </div>
              <button
                onClick={() => setShowPayment(true)}
                className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-400"
              >
                Unlock {surname} Prep — KES 10
              </button>
            </div>
          </div>
        </div>

        <PaymentModal
          playerSlug={player.slug}
          playerName={player.full_name}
          open={showPayment}
          onClose={() => setShowPayment(false)}
          onSuccess={() => {
            setShowPayment(false);
          }}
        />
      </div>
    );
  }

  if (prepLoading) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (!prepData) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-xl font-semibold text-gray-900">
          {prepError || "Failed to load prep data."}
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Your access is confirmed. Try refreshing the page.
        </p>
        <button
          onClick={() => {
            if (slug && phoneNumber) {
              dispatch(fetchPlayerPrep({ slug, phone: phoneNumber }));
            }
          }}
          className="btn-primary mt-4 inline-flex"
        >
          Retry
        </button>
      </div>
    );
  }

  const prepSummary = prepData.performance_summary ?? summary;
  const winCondition = getScoutingSection(prepData, player, "win_condition");
  const timePressure = getScoutingSection(prepData, player, "time_pressure");
  const commonMistakes = getScoutingSection(prepData, player, "common_mistakes");
  const quickPrep = getScoutingSection(prepData, player, "quick_prep");
  const comfortZoneCopy =
    strongestBlackOpening?.opening_name ||
    `${surname} is most comfortable when he can generate dynamic play with Black.`;

  return (
    <div className="print:text-sm">
      <PageHeader
        title={`${surname} Preparatory`}
        subtitle={`How to beat ${playerName}. Not a course. A paid match plan.`}
        actions={
          <div className="no-print flex flex-wrap gap-3">
            <ShareButton slug={player.slug} playerName={playerName} />
            <button onClick={() => window.print()} className="btn-secondary text-sm">
              Print Report
            </button>
            <Link href={`/players/${player.slug}`} className="btn-secondary text-sm">
              Back to profile
            </Link>
          </div>
        }
      />

      <div className="no-print mb-8 overflow-hidden rounded-[32px] border border-slate-800 bg-[radial-gradient(circle_at_top,_rgba(12,147,231,0.18),_transparent_38%),linear-gradient(180deg,#020617_0%,#0f172a_60%,#111827_100%)] text-white shadow-xl">
        <div className="px-6 py-7 sm:px-8">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Unlocked</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {prepSummary?.total_games ?? 0} games analyzed
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Opponent Intelligence</span>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/10 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
                Comfort Zone
              </p>
              <h2 className="mt-3 text-2xl font-bold text-white">
                {formatPercent(prepSummary?.black_score)} with Black
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-200">{comfortZoneCopy}</p>
            </div>

            <div className="rounded-2xl border border-red-400/15 bg-red-400/10 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-red-200">
                Weakness
              </p>
              <h2 className="mt-3 text-2xl font-bold text-white">
                {formatPercent(prepSummary?.white_score)} with White
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                {prepData.weaknesses[0]?.title ||
                  `${surname} is less convincing when he has to press with White.`}
              </p>
            </div>

            <div className="rounded-2xl border border-brand-400/15 bg-brand-500/10 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-100">
                Prep Priority
              </p>
              <h2 className="mt-3 text-2xl font-bold text-white">
                Deny the positions he wants
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                {prepData.prep_recommendations[0]?.description ||
                  "Make the game slower, calmer, and more positional than he prefers."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <SectionContainer title="">
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700">
            If You Remember Nothing Else
          </p>
          <ul className="mt-4 space-y-3">
            {[
              `${surname} scores ${formatPercent(prepSummary?.black_score)} with Black — his danger zone. Respect it.`,
              `With White he only scores ${formatPercent(prepSummary?.white_score)} — that is where you press.`,
              `His best Black weapon is ${
                strongestBlackOpening?.opening_name || "dynamic Sicilian structures"
              }. Deny it early.`,
              "If you have an edge, simplify. He thrives in chaos, not in endings.",
              `One win condition: make ${surname} prove he can improve a quiet position from scratch.`,
            ].map((bullet) => (
              <li key={bullet} className="flex items-start gap-3 text-sm leading-6 text-amber-900">
                <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-amber-500" />
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      </SectionContainer>

      <SectionContainer title="Executive Summary" subtitle="The high-level case before you look at lines">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="card p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
              Dossier Summary
            </p>
            <p className="mt-3 leading-relaxed text-gray-700">{prepData.bio}</p>
            {prepSummary?.summary_text && (
              <p className="mt-4 border-t border-gray-100 pt-4 leading-relaxed text-gray-600">
                {prepSummary.summary_text}
              </p>
            )}
          </div>

          <div className="card p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">
              Player Snapshot
            </p>
            <div className="mt-4 space-y-3 text-sm text-gray-600">
              {player.federation && (
                <div className="flex items-center justify-between gap-3">
                  <span>Federation</span>
                  <span className="font-semibold text-gray-900">{player.federation}</span>
                </div>
              )}
              {player.fide_id && (
                <div className="flex items-center justify-between gap-3">
                  <span>FIDE ID</span>
                  <span className="font-semibold text-gray-900">{player.fide_id}</span>
                </div>
              )}
              {player.birth_year && (
                <div className="flex items-center justify-between gap-3">
                  <span>Born</span>
                  <span className="font-semibold text-gray-900">{player.birth_year}</span>
                </div>
              )}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <StatCard label="Standard" value={player.standard_rating ?? "—"} sublabel="FIDE Standard" />
              <StatCard label="Rapid" value={player.rapid_rating ?? "—"} sublabel="FIDE Rapid" />
              <StatCard label="Blitz" value={player.blitz_rating ?? "—"} sublabel="FIDE Blitz" />
            </div>
          </div>
        </div>
      </SectionContainer>

      {prepSummary && (
        <SectionContainer title="Key Numbers" subtitle="The core evidence behind the prep">
          <div className="grid gap-4 sm:grid-cols-5">
            <StatCard label="Games" value={prepSummary.total_games} />
            <StatCard
              label="Win Rate"
              value={`${prepSummary.win_rate}%`}
              variant={Number(prepSummary.win_rate) >= 50 ? "success" : "danger"}
            />
            <StatCard label="Wins" value={prepSummary.wins} variant="success" />
            <StatCard label="Draws" value={prepSummary.draws} variant="warning" />
            <StatCard label="Losses" value={prepSummary.losses} variant="danger" />
          </div>
        </SectionContainer>
      )}

      {winCondition && (
        <SectionContainer title="">
          <WinConditionCard section={winCondition} />
        </SectionContainer>
      )}

      {prepSummary && (
        <SectionContainer
          title="How to Face Him"
          subtitle={`What changes when ${playerName} has White or Black`}
        >
          <div className="grid gap-6 xl:grid-cols-2">
            <div>
              <PerformanceSplitCard
                label={`${playerName} as White`}
                games={prepSummary.white_games}
                score={Number(prepSummary.white_score)}
                colorIndicator="white"
              />
              <div className="card mt-4 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-red-600">
                  Weakness
                </p>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  With only {formatPercent(prepSummary.white_score)} as White, the burden of proving
                  advantage is where {surname} looks most vulnerable. Keep the position sound and let
                  him be the one who overreaches.
                </p>
              </div>
              {whiteOpenings.length > 0 && (
                <div className="mt-4">
                  <OpeningBreakdownCard
                    title="Opening Breakdown as White"
                    openings={whiteOpenings}
                    colorLabel="White"
                  />
                </div>
              )}
            </div>

            <div>
              <PerformanceSplitCard
                label={`${playerName} as Black`}
                games={prepSummary.black_games}
                score={Number(prepSummary.black_score)}
                colorIndicator="black"
              />
              <div className="card mt-4 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-600">
                  Comfort Zone
                </p>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  At {formatPercent(prepSummary.black_score)} with Black, this is the side where you
                  need the cleanest discipline. Do not hand him easy tactical flow or comfortable
                  ...g6 structures unless you have a concrete reason.
                </p>
              </div>
              {blackOpenings.length > 0 && (
                <div className="mt-4">
                  <OpeningBreakdownCard
                    title="Opening Breakdown as Black"
                    openings={blackOpenings}
                    colorLabel="Black"
                  />
                </div>
              )}
            </div>
          </div>
        </SectionContainer>
      )}

      {timePressure && (
        <SectionContainer title="">
          <TimePressureCard section={timePressure} />
        </SectionContainer>
      )}

      {prepData.strengths.length > 0 && (
        <SectionContainer
          title={`What ${surname} Wants`}
          subtitle="The positions and dynamics that help him most"
        >
          <StrengthWeaknessCard
            items={prepData.strengths}
            type="strength"
            eyebrow="COMFORT ZONE"
            title="What To Respect"
          />
        </SectionContainer>
      )}

      {prepData.weaknesses.length > 0 && (
        <SectionContainer
          title="What to Deny"
          subtitle={`The patterns that create the best practical edge against ${surname}`}
        >
          <StrengthWeaknessCard
            items={prepData.weaknesses}
            type="weakness"
            eyebrow="WEAKNESS"
            title="Where To Press"
          />
        </SectionContainer>
      )}

      {commonMistakes && (
        <SectionContainer title="">
          <CommonMistakesCard section={commonMistakes} />
        </SectionContainer>
      )}

      {prepData.prep_recommendations.length > 0 && (
        <SectionContainer
          title="Prep Priorities"
          subtitle="Actionable scenarios to remember before round start"
        >
          <div className="space-y-4">
            {prepData.prep_recommendations.map((recommendation, index) => (
              <div key={recommendation.id} className="card p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
                      Prep Priority
                    </p>
                    <h4 className="mt-1 font-semibold text-gray-900">
                      {recommendation.scenario_title}
                    </h4>
                    {recommendation.description && (
                      <p className="mt-2 text-sm leading-relaxed text-gray-600">
                        {recommendation.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionContainer>
      )}

      {player.recent_games.length > 0 && (
        <SectionContainer
          title="Recent Games"
          subtitle={`Last ${player.recent_games.length} games on record`}
        >
          <GamesTable games={player.recent_games} />
          <div className="no-print mt-3 text-right">
            <Link href={`/players/${player.slug}/games`} className="text-sm text-brand-600 hover:underline">
              View all games →
            </Link>
          </div>
        </SectionContainer>
      )}

      {quickPrep && (
        <SectionContainer
          title="One-Page Match Plan"
          subtitle="The fastest read in the entire product"
          className="mt-4"
        >
          <QuickPrepCard section={quickPrep} />
        </SectionContainer>
      )}

      <div className="no-print mt-8 flex flex-wrap items-center justify-center gap-3">
        <ShareButton slug={player.slug} playerName={playerName} />
      </div>

      <div className="mt-12 border-t border-gray-200 pt-6 text-center text-sm text-gray-400 print:mt-8">
        <p>
          Mbaku Preparatory · Paid scouting dossier for {playerName} · Based on{" "}
          {prepSummary?.total_games ?? 0} analyzed games
        </p>
      </div>
    </div>
  );
}
