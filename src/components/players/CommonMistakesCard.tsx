import type { ScoutingSection } from "@/types";

interface CommonMistakesCardProps {
  section: ScoutingSection;
}

export function CommonMistakesCard({ section }: CommonMistakesCardProps) {
  const { intro, avoid, do_instead } = section.content;
  const title = section.title || "Common Mistakes Against This Player";

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-red-100 bg-gradient-to-r from-red-50 to-rose-50 px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500 text-white text-sm font-bold">
            &#9888;
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-red-700">
              Do Not Give Him This
            </p>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            {intro && <p className="text-sm text-red-700">{intro}</p>}
          </div>
        </div>
      </div>
      <div className="grid divide-gray-100 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        {avoid && (
          <div className="p-5">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-red-700">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-xs">
                &#10005;
              </span>
              Avoid
            </h4>
            <ul className="space-y-2">
              {(avoid as string[]).map((item: string, i: number) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <span className="mt-0.5 text-red-400 flex-shrink-0">&mdash;</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {do_instead && (
          <div className="p-5">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs">
                &#10003;
              </span>
              Do Instead
            </h4>
            <ul className="space-y-2">
              {(do_instead as string[]).map((item: string, i: number) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <span className="mt-0.5 text-emerald-500 flex-shrink-0">&#10140;</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
