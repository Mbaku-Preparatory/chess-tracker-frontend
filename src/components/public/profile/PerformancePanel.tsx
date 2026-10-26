import type { ResultCounts } from "@/lib/publicPlayer";

function pct(part: number, whole: number): number {
  return whole ? (part / whole) * 100 : 0;
}

function fmt(n: number): string {
  return `${n.toFixed(1)}%`;
}

/** Win/draw/loss as one bar. Widths are the raw shares, so they always sum
 * to exactly 100% — rounding happens only in the labels. */
function ResultBar({ counts }: { counts: ResultCounts }) {
  const { games, wins, draws, losses } = counts;
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-ink-raised" aria-hidden="true">
      <div className="bg-result-win" style={{ width: `${pct(wins, games)}%` }} />
      <div className="bg-result-draw" style={{ width: `${pct(draws, games)}%` }} />
      <div className="bg-result-loss" style={{ width: `${pct(losses, games)}%` }} />
    </div>
  );
}

function Rate({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={`text-[24px] font-[480] tabular-nums leading-none ${tone}`}>{fmt(value)}</span>
      <span className="text-[12px] text-ink-faint">{label}</span>
    </div>
  );
}

function ColourCard({ colour, counts }: { colour: "White" | "Black"; counts: ResultCounts }) {
  const score = counts.games ? ((counts.wins + counts.draws / 2) / counts.games) * 100 : 0;
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-ink-raised/60 p-5">
      <div className="flex items-center gap-2 text-[13px] text-ink-muted">
        <span
          className={`h-3 w-3 rounded-full border border-ink-faint ${colour === "White" ? "bg-ink-text" : "bg-ink-canvas"}`}
          aria-hidden="true"
        />
        As {colour.toLowerCase()}
      </div>
      <p className="text-[28px] font-[480] tabular-nums leading-none">{counts.games ? fmt(score) : "—"}</p>
      <p className="text-[12px] text-ink-faint">score</p>
      <ResultBar counts={counts} />
      <p className="text-[12px] tabular-nums text-ink-faint">
        {counts.games} games ·{" "}
        <span className="whitespace-nowrap">+{counts.wins} ={counts.draws} −{counts.losses}</span>
      </p>
    </div>
  );
}

export function PerformancePanel({
  stats,
}: {
  stats: ResultCounts & { white: ResultCounts; black: ResultCounts; averageOpponentElo: number | null };
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-4">
        <Rate label="Win rate" value={pct(stats.wins, stats.games)} tone="text-accent-soft" />
        <Rate label="Draw rate" value={pct(stats.draws, stats.games)} tone="text-ink-text" />
        <Rate label="Loss rate" value={pct(stats.losses, stats.games)} tone="text-result-loss" />
      </div>
      <ResultBar counts={stats} />
      <dl className="flex flex-wrap gap-x-8 gap-y-3 text-[13px]">
        <div>
          <dt className="text-ink-faint">Games</dt>
          <dd className="text-[18px] font-[480] tabular-nums">{stats.games.toLocaleString("en")}</dd>
        </div>
        <div>
          <dt className="text-ink-faint">Record</dt>
          <dd className="whitespace-nowrap text-[18px] font-[480] tabular-nums">
            +{stats.wins} ={stats.draws} −{stats.losses}
          </dd>
        </div>
        <div>
          <dt className="text-ink-faint">Avg. opponent</dt>
          <dd className="text-[18px] font-[480] tabular-nums">{stats.averageOpponentElo ?? "—"}</dd>
        </div>
      </dl>
      <div className="grid gap-4 sm:grid-cols-2">
        <ColourCard colour="White" counts={stats.white} />
        <ColourCard colour="Black" counts={stats.black} />
      </div>
    </div>
  );
}
