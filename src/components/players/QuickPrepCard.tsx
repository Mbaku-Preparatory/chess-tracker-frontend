import type { ScoutingSection } from "@/types";

interface QuickPrepCardProps {
  section: ScoutingSection;
}

export function QuickPrepCard({ section }: QuickPrepCardProps) {
  const { intro, bullets } = section.content;
  const title = section.title || "30-Second Prep Mode";

  return (
    <div className="card overflow-hidden border-2 border-brand-200 shadow-sm">
      <div className="bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white text-lg font-bold">
            &#9889;
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-100">
              30-Second Prep Mode
            </p>
            <h3 className="text-lg font-bold text-white">{title}</h3>
            {intro && <p className="text-sm text-brand-100">{intro}</p>}
          </div>
        </div>
      </div>
      <div className="bg-brand-50/50 p-6">
        <ul className="space-y-3">
          {(bullets as string[]).map((bullet: string, i: number) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                {i + 1}
              </span>
              <span className="text-sm font-medium leading-relaxed text-gray-800">
                {bullet}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
