"use client";

import { useState } from "react";
import type { PrepSummary, PrepTreeNode, PrepMoveFreq, PrepLine } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function sourceLabel(source: string): string {
  const map: Record<string, string> = {
    chess_results: "OTB",
    chess_com: "Chess.com",
    lichess: "Lichess",
    pgn_import: "PGN",
    manual: "Manual",
  };
  return map[source] ?? source;
}

function sourceColor(source: string): string {
  const map: Record<string, string> = {
    chess_results: "bg-amber-500",
    chess_com: "bg-emerald-500",
    lichess: "bg-violet-500",
    pgn_import: "bg-blue-400",
    manual: "bg-gray-400",
  };
  return map[source] ?? "bg-gray-400";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { year: "numeric", month: "short" });
}

// ── Mini bar chart ────────────────────────────────────────────────────────────

function FreqBar({ item, maxPct }: { item: PrepMoveFreq; maxPct: number }) {
  const widthPct = maxPct > 0 ? (item.pct / maxPct) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 shrink-0 font-mono text-sm font-semibold text-gray-800">
        {item.move}
      </span>
      <div className="flex-1">
        <div className="h-5 overflow-hidden rounded bg-gray-100">
          <div
            className="h-full rounded bg-brand-500 transition-all"
            style={{ width: `${widthPct}%` }}
          />
        </div>
      </div>
      <span className="w-14 shrink-0 text-right text-xs text-gray-500">
        {item.count}g · {item.pct}%
      </span>
    </div>
  );
}

function FreqSection({
  title,
  subtitle,
  items,
  emptyMsg,
}: {
  title: string;
  subtitle?: string;
  items: PrepMoveFreq[];
  emptyMsg: string;
}) {
  const maxPct = items.length > 0 ? items[0].pct : 0;
  return (
    <div>
      <h4 className="mb-1 text-sm font-semibold text-gray-800">{title}</h4>
      {subtitle && <p className="mb-2 text-xs text-gray-500">{subtitle}</p>}
      {items.length === 0 ? (
        <p className="text-xs text-gray-400">{emptyMsg}</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((item) => (
            <FreqBar key={item.move} item={item} maxPct={maxPct} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Common lines list ─────────────────────────────────────────────────────────

function CommonLines({ lines }: { lines: PrepLine[] }) {
  if (lines.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
        Common lines
      </p>
      <div className="space-y-1">
        {lines.map((l, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="font-mono text-gray-700 flex-1">{l.line}</span>
            <span className="shrink-0 text-gray-400">{l.count}g · {l.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Opening tree node (recursive) ────────────────────────────────────────────

function TreeNode({
  node,
  depth,
  autoExpand,
}: {
  node: PrepTreeNode;
  depth: number;
  autoExpand: boolean;
}) {
  const [open, setOpen] = useState(autoExpand);
  const hasChildren = node.children.length > 0;

  const indentPx = depth * 16;

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={!hasChildren}
        className={`flex w-full items-center gap-2 py-1 text-left transition-colors hover:bg-gray-50 ${
          !hasChildren ? "cursor-default" : ""
        }`}
        style={{ paddingLeft: `${indentPx + 8}px` }}
      >
        {/* expand icon */}
        <span className="shrink-0 w-3.5 text-gray-400">
          {hasChildren ? (open ? "▾" : "▸") : "·"}
        </span>

        {/* move */}
        <span className="font-mono text-sm font-medium text-gray-800">
          {node.move}
        </span>

        {/* bar */}
        <div
          className="mx-2 h-2 rounded bg-brand-400 shrink-0"
          style={{ width: `${Math.max(4, node.pct)}px` }}
        />

        {/* stats */}
        <span className="text-xs text-gray-500">
          {node.count}g · {node.pct}%
        </span>
      </button>

      {open && hasChildren && (
        <div>
          {node.children.map((child, i) => (
            <TreeNode
              key={`${child.move}-${i}`}
              node={child}
              depth={depth + 1}
              autoExpand={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MiniTree({
  total,
  children,
  label,
}: {
  total: number;
  children: PrepTreeNode[];
  label: string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (total === 0 || children.length === 0) {
    return <p className="text-xs text-gray-400 mt-2">No move data.</p>;
  }

  return (
    <div className="mt-3">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700"
      >
        <span>{expanded ? "▾" : "▸"}</span>
        {expanded ? "Hide" : "Show"} move tree ({total} games)
      </button>

      {expanded && (
        <div className="mt-2 rounded-lg border border-gray-200 bg-white py-2 overflow-x-auto">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            {label}
          </p>
          {children.map((node, i) => (
            <TreeNode
              key={`${node.move}-${i}`}
              node={node}
              depth={0}
              autoExpand={i === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Trend card ────────────────────────────────────────────────────────────────

function TrendCard({ trend }: { trend: PrepSummary["trends"][number] }) {
  const colorLabel = trend.color === "white" ? "White" : "Black";
  const badge =
    trend.confidence === "high"
      ? "bg-amber-100 text-amber-700"
      : "bg-gray-100 text-gray-600";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-800">{trend.description}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {colorLabel} · {trend.label}{trend.move}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge}`}>
          {trend.confidence === "high" ? "Strong signal" : "Emerging"}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <div className="flex-1">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Overall</p>
          <div className="h-2 rounded bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded bg-gray-400"
              style={{ width: `${trend.overall_pct}%` }}
            />
          </div>
          <p className="mt-0.5 text-xs text-gray-500">{trend.overall_pct}%</p>
        </div>
        <div className="flex-1">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Recent</p>
          <div className="h-2 rounded bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded bg-brand-500"
              style={{ width: `${trend.recent_pct}%` }}
            />
          </div>
          <p className="mt-0.5 text-xs text-gray-700 font-medium">{trend.recent_pct}%</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Shift</p>
          <p className="text-sm font-bold text-amber-600">+{trend.delta}pp</p>
        </div>
      </div>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string | number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {badge !== undefined && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {badge} games
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function PrepSummaryPanel({ data }: { data: PrepSummary }) {
  const { meta, as_white, as_black, trends } = data;
  const sourcesEntries = Object.entries(meta.source_counts).sort(([, a], [, b]) => (b ?? 0) - (a ?? 0));

  return (
    <div className="space-y-5">
      {/* Meta strip */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Games analyzed</p>
            <p className="text-2xl font-bold text-gray-900">{meta.total_games}</p>
          </div>

          {sourcesEntries.length > 0 && (
            <div className="flex flex-wrap gap-2 ml-2">
              {sourcesEntries.map(([src, n]) => (
                <span
                  key={src}
                  className="flex items-center gap-1.5 rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-700"
                >
                  <span className={`h-2 w-2 rounded-full ${sourceColor(src)}`} />
                  {sourceLabel(src)}: {n}
                </span>
              ))}
            </div>
          )}

          {(meta.date_range.first || meta.date_range.last) && (
            <div className="ml-auto text-right">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Date range</p>
              <p className="text-sm text-gray-700">
                {formatDate(meta.date_range.first)} – {formatDate(meta.date_range.last)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* No data state */}
      {meta.total_games === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-500">No move data yet. Import games with move text first.</p>
        </div>
      )}

      {meta.total_games > 0 && (
        <>
          {/* As White */}
          <Section title="As White" badge={as_white.total}>
            {as_white.total === 0 ? (
              <p className="text-xs text-gray-400">No games as White.</p>
            ) : (
              <>
                <FreqSection
                  title="First moves"
                  items={as_white.first_moves}
                  emptyMsg="No first-move data."
                />
                <CommonLines lines={as_white.common_lines} />
                <MiniTree
                  total={as_white.opening_tree.total}
                  children={as_white.opening_tree.children}
                  label="Opening tree — as White"
                />
              </>
            )}
          </Section>

          {/* As Black */}
          <Section title="As Black" badge={as_black.total}>
            {as_black.total === 0 ? (
              <p className="text-xs text-gray-400">No games as Black.</p>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* vs 1.e4 */}
                <div>
                  <FreqSection
                    title="vs 1.e4"
                    subtitle={`${as_black.vs_e4.count} game${as_black.vs_e4.count !== 1 ? "s" : ""}`}
                    items={as_black.vs_e4.responses}
                    emptyMsg="No games vs 1.e4."
                  />
                  <CommonLines lines={as_black.vs_e4.common_lines} />
                </div>

                {/* vs 1.d4 */}
                <div>
                  <FreqSection
                    title="vs 1.d4"
                    subtitle={`${as_black.vs_d4.count} game${as_black.vs_d4.count !== 1 ? "s" : ""}`}
                    items={as_black.vs_d4.responses}
                    emptyMsg="No games vs 1.d4."
                  />
                  <CommonLines lines={as_black.vs_d4.common_lines} />
                </div>

                {/* vs other */}
                {as_black.vs_other.count > 0 && (
                  <div className="sm:col-span-2">
                    <FreqSection
                      title="vs other first moves"
                      subtitle={`${as_black.vs_other.count} game${as_black.vs_other.count !== 1 ? "s" : ""}`}
                      items={as_black.vs_other.responses}
                      emptyMsg=""
                    />
                  </div>
                )}
              </div>
            )}

            {as_black.total > 0 && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <MiniTree
                  total={as_black.opening_tree.total}
                  children={as_black.opening_tree.children}
                  label="Opening tree — as Black (from White's first move)"
                />
              </div>
            )}
          </Section>

          {/* Trends */}
          {trends.length > 0 && (
            <Section title="Recent trends">
              <p className="mb-4 text-xs text-gray-500">
                Comparing the most recent 15 games against the full dataset. Only shown when the shift is statistically meaningful.
              </p>
              <div className="space-y-3">
                {trends.map((t, i) => (
                  <TrendCard key={i} trend={t} />
                ))}
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  );
}
