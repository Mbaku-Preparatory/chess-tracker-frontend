import type { ScoutingSection } from "@/types";

interface WinConditionCardProps {
  section: ScoutingSection;
}

export function WinConditionCard({ section }: WinConditionCardProps) {
  const { intro, as_white, as_black } = section.content;
  const title = section.title || "How You Beat This Player";

  return (
    <div className="card overflow-hidden border-2 border-amber-200 shadow-sm">
      <div className="border-b border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-lg">
            &#9876;
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700">
              Prep Priority
            </p>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            {intro && <p className="text-sm text-amber-700">{intro}</p>}
          </div>
        </div>
      </div>
      <div className="grid divide-amber-100 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        {as_white && (
          <div className="p-5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
              As White
            </p>
            <div className="mb-3 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full border border-gray-300 bg-white" />
              <h4 className="font-semibold text-gray-900">{as_white.heading}</h4>
            </div>
            <ul className="space-y-2">
              {(as_white.points as string[]).map((point: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-1 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
                    {i + 1}
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {as_black && (
          <div className="p-5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              As Black
            </p>
            <div className="mb-3 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-gray-800" />
              <h4 className="font-semibold text-gray-900">{as_black.heading}</h4>
            </div>
            <ul className="space-y-2">
              {(as_black.points as string[]).map((point: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-1 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-600">
                    {i + 1}
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
