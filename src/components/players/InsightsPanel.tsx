"use client";

import type {
  InsightConfidence,
  InsightDangerZone,
  InsightMatchPlanItem,
  InsightRecommendedLine,
  InsightWeakness,
  PlayerInsights,
} from "@/types";

interface InsightsPanelProps {
  insights: PlayerInsights;
}

// ── Small helpers ────────────────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: InsightConfidence }) {
  const colors: Record<string, string> = {
    High: "bg-emerald-100 text-emerald-800 border-emerald-200",
    Medium: "bg-amber-100 text-amber-800 border-amber-200",
    Low: "bg-orange-100 text-orange-800 border-orange-200",
    "Very Low": "bg-red-100 text-red-800 border-red-200",
    None: "bg-gray-100 text-gray-600 border-gray-200",
  };
  const cls = colors[confidence.label] ?? colors.None;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}
      title={confidence.reason}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          confidence.label === "High"
            ? "bg-emerald-500"
            : confidence.label === "Medium"
            ? "bg-amber-500"
            : "bg-red-500"
        }`}
      />
      Confidence: {confidence.label} ({confidence.score}/100)
    </span>
  );
}

function SeverityDot({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: "bg-red-500",
    high: "bg-orange-500",
    moderate: "bg-amber-400",
  };
  return (
    <span
      className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${colors[severity] ?? "bg-gray-400"}`}
    />
  );
}

function RiskBadge({ level }: { level: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        level === "high"
          ? "bg-red-100 text-red-700"
          : "bg-amber-100 text-amber-700"
      }`}
    >
      {level === "high" ? "High risk" : "Medium risk"}
    </span>
  );
}

function MatchPlanTypeIcon({ type }: { type: InsightMatchPlanItem["type"] }) {
  const cfg = {
    target: { icon: "→", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    caution: { icon: "!", cls: "text-red-700 bg-red-50 border-red-200" },
    consider: { icon: "?", cls: "text-amber-700 bg-amber-50 border-amber-200" },
    general: { icon: "·", cls: "text-brand-700 bg-brand-50 border-brand-200" },
  };
  const c = cfg[type] ?? cfg.general;
  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${c.cls}`}
    >
      {c.icon}
    </span>
  );
}

// ── Section: Recommended lines ───────────────────────────────────────────────

function RecommendedLines({ lines }: { lines: InsightRecommendedLine[] }) {
  if (!lines.length) return null;
  return (
    <section>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">
        Recommended Lines
      </h3>
      <div className="space-y-2">
        {lines.map((rec, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3"
          >
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
              {i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-gray-900">
                  {rec.opening_name || rec.eco_code}
                </span>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">
                  {rec.eco_code}
                </span>
                <span className="text-xs text-gray-400">
                  opp. has {rec.color}
                </span>
                {rec.recommendation_strength === "strong" && (
                  <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    Strong target
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-600">{rec.rationale}</p>
              <p className="mt-1 text-xs text-gray-500">
                Opponent scores{" "}
                <strong className="text-red-600">{rec.opponent_score}%</strong>{" "}
                across {rec.opponent_games} game{rec.opponent_games !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Section: Weaknesses ──────────────────────────────────────────────────────

function Weaknesses({ weaknesses }: { weaknesses: InsightWeakness[] }) {
  if (!weaknesses.length) return null;
  return (
    <section>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">
        Detected Weaknesses
      </h3>
      <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200">
        {weaknesses.map((w, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50/50">
            <SeverityDot severity={w.severity} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium text-gray-900 text-sm">
                  {w.opening_name || w.eco_code}
                </span>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">
                  {w.eco_code}
                </span>
                <span className="text-xs text-gray-400">as {w.color}</span>
                {w.severity === "critical" && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                    Critical
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-gray-500">{w.description}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-lg font-bold text-red-600">{w.score_percent}%</p>
              <p className="text-[10px] text-gray-400">{w.games_count}g</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Section: Danger zones ────────────────────────────────────────────────────

function DangerZones({ zones }: { zones: InsightDangerZone[] }) {
  if (!zones.length) return null;
  return (
    <section>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">
        Danger Zones
      </h3>
      <div className="space-y-2">
        {zones.map((dz, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50/50 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium text-gray-900 text-sm">
                  {dz.opening_name || dz.eco_code}
                </span>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">
                  {dz.eco_code}
                </span>
                <span className="text-xs text-gray-400">as {dz.color}</span>
                <RiskBadge level={dz.risk_level} />
              </div>
              <p className="mt-0.5 text-xs text-gray-600">{dz.advice}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-lg font-bold text-emerald-700">{dz.score_percent}%</p>
              <p className="text-[10px] text-gray-400">{dz.games_count}g</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Section: Match plan ──────────────────────────────────────────────────────

function MatchPlan({ plan }: { plan: InsightMatchPlanItem[] }) {
  if (!plan.length) return null;
  return (
    <section>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">
        Match Plan
      </h3>
      <ol className="space-y-2">
        {plan.map((item) => (
          <li key={item.order} className="flex items-start gap-3">
            <MatchPlanTypeIcon type={item.type} />
            <p className="text-sm leading-relaxed text-gray-700">{item.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ── Section: Evidence table ──────────────────────────────────────────────────

function EvidenceTable({ insights }: { insights: PlayerInsights }) {
  const ev = insights.evidence;
  const worst = ev.worst_openings;
  if (!worst.length) return null;
  return (
    <section>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">
        Underlying Data
      </h3>
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs text-gray-500">
              <th className="px-4 py-2 font-semibold">Opening</th>
              <th className="px-3 py-2 font-semibold">Color</th>
              <th className="px-3 py-2 font-semibold">Games</th>
              <th className="px-3 py-2 font-semibold text-right">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[...ev.worst_openings, ...ev.best_openings]
              .filter((row, idx, arr) => arr.findIndex((r) => r.eco_code === row.eco_code && r.color === row.color) === idx)
              .sort((a, b) => a.score_percent - b.score_percent)
              .map((row, i) => (
                <tr key={i} className="hover:bg-gray-50/50">
                  <td className="max-w-[180px] truncate px-4 py-2 font-medium text-gray-900">
                    <span className="font-mono text-[10px] text-gray-400 mr-1.5">{row.eco_code}</span>
                    {row.opening_name || row.eco_code}
                  </td>
                  <td className="px-3 py-2 text-gray-500 capitalize">{row.color}</td>
                  <td className="px-3 py-2 text-gray-500">{row.games_count}</td>
                  <td
                    className={`px-3 py-2 text-right font-semibold tabular-nums ${
                      row.score_percent < 40
                        ? "text-red-600"
                        : row.score_percent >= 60
                        ? "text-emerald-600"
                        : "text-gray-700"
                    }`}
                  >
                    {row.score_percent}%
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── Data-quality banner ──────────────────────────────────────────────────────

function DataQualityBanner({ quality }: { quality: string }) {
  if (quality === "good") return null;
  const text =
    quality === "fair"
      ? "Limited game sample — insights are directional, not conclusive. Import more games for better accuracy."
      : quality === "limited"
      ? "Very few games available. Findings are early indicators only."
      : "No game data. Import PGN games to generate insights.";
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <strong>Data quality: {quality}.</strong> {text}
    </div>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────────

export function InsightsPanel({ insights }: InsightsPanelProps) {
  const { meta, confidence, executive_summary, recommended_lines, weaknesses, danger_zones, match_plan } = insights;

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Computed Prep Insights</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {meta.games_analyzed} game{meta.games_analyzed !== 1 ? "s" : ""} analysed
            {" · "}
            {meta.openings_tracked} opening{meta.openings_tracked !== 1 ? "s" : ""} tracked
          </p>
        </div>
        <ConfidenceBadge confidence={confidence} />
      </div>

      <DataQualityBanner quality={meta.data_quality} />

      {/* Executive summary */}
      <div className="rounded-xl border border-brand-100 bg-brand-50/40 px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-600 mb-2">
          Summary
        </p>
        <p className="text-sm leading-relaxed text-gray-800">{executive_summary}</p>
      </div>

      <RecommendedLines lines={recommended_lines} />
      <Weaknesses weaknesses={weaknesses} />
      <DangerZones zones={danger_zones} />
      <MatchPlan plan={match_plan} />
      <EvidenceTable insights={insights} />
    </div>
  );
}
