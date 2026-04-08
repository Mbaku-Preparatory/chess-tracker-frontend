import type { OpeningStat } from "@/types";
import { EcoBadge } from "@/components/ui/Badge";

interface OpeningBreakdownCardProps {
  title: string;
  openings: OpeningStat[];
  colorLabel: "White" | "Black";
}

export function OpeningBreakdownCard({ title, openings, colorLabel }: OpeningBreakdownCardProps) {
  if (!openings.length) return null;

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <div
            className={`h-3 w-3 rounded-full ${
              colorLabel === "White" ? "border border-gray-300 bg-white" : "bg-gray-800"
            }`}
          />
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
      </div>
      <div className="divide-y divide-gray-50">
        {openings.map((opening) => (
          <div
            key={opening.id}
            className="flex items-center justify-between px-5 py-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <EcoBadge code={opening.eco_code} />
              <span className="truncate text-sm text-gray-700">
                {opening.opening_name}
              </span>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0 ml-4">
              <span className="text-xs text-gray-400">
                {opening.games_count} game{opening.games_count !== 1 ? "s" : ""}
              </span>
              {opening.score_percent !== null && (
                <span
                  className={`text-sm font-semibold ${
                    opening.score_percent >= 60
                      ? "text-emerald-600"
                      : opening.score_percent >= 40
                        ? "text-amber-600"
                        : "text-red-600"
                  }`}
                >
                  {opening.score_percent}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
