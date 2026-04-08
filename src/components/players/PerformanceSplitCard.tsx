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
    score >= 60 ? "text-emerald-600" : score >= 40 ? "text-amber-600" : "text-red-600";

  const barColor =
    score >= 60 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <div
          className={`h-3 w-3 rounded-full ${
            colorIndicator === "white"
              ? "border border-gray-300 bg-white"
              : "bg-gray-800"
          }`}
        />
        <h3 className="font-semibold text-gray-900">{label}</h3>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-bold ${scoreColor}`}>{score}%</span>
        <span className="text-sm text-gray-400">score</span>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        {games} game{games !== 1 ? "s" : ""}
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
