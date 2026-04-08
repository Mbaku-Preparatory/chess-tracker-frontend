import type { PrepRecommendation } from "@/types";

interface PrepRecommendationCardProps {
  recommendations: PrepRecommendation[];
}

export function PrepRecommendationCard({ recommendations }: PrepRecommendationCardProps) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-brand-100 bg-brand-50/50 px-5 py-4">
        <h3 className="font-semibold text-gray-900">Prep Recommendations</h3>
      </div>
      <div className="divide-y divide-gray-50">
        {recommendations.map((rec, idx) => (
          <div key={rec.id} className="px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                {idx + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {rec.scenario_title}
                </p>
                {rec.description && (
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                    {rec.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
