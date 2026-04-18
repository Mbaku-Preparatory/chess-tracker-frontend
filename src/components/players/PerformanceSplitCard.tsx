interface PerformanceSplitCardProps {
  label: string;
  games: number;
  score: number;
  colorIndicator: "white" | "black";
}

export function PerformanceSplitCard({
  label,
  games,
  score,
  colorIndicator,
}: PerformanceSplitCardProps) {
  const scoreColor =
    score >= 60
      ? "text-emerald-600 dark:text-emerald-400"
      : score >= 40
      ? "text-amber-600 dark:text-amber-400"
      : "text-red-600 dark:text-red-400";

  const barColor =
    score >= 60 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <div
          className={`h-3 w-3 rounded-full ${
            colorIndicator === "white"
              ? "border border-gray-300 bg-white dark:border-gray-500 dark:bg-gray-200"
              : "bg-gray-800 dark:bg-gray-300"
          }`}
        />
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{label}</h3>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-bold ${scoreColor}`}>{score}%</span>
        <span className="text-sm text-gray-400 dark:text-gray-500">score</span>
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {games} game{games !== 1 ? "s" : ""}
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-elevated">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
