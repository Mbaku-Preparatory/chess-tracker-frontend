import type { ScoutingSection } from "@/types";

interface TimePressureCardProps {
  section: ScoutingSection;
}

export function TimePressureCard({ section }: TimePressureCardProps) {
  const { intro, observations, takeaway } = section.content;

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-sky-100 bg-gradient-to-r from-sky-50 to-cyan-50 px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-white text-sm font-bold">
            &#9201;
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
              Pressure Profile
            </p>
            <h3 className="text-lg font-bold text-gray-900">{section.title}</h3>
            {intro && <p className="text-sm text-sky-700">{intro}</p>}
          </div>
        </div>
      </div>
      <div className="p-5">
        {observations && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Observed Tendencies
            </h4>
            <ul className="space-y-2">
              {(observations as string[]).map((obs: string, i: number) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-400" />
                  <span>{obs}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {takeaway && (
          <div className="rounded-lg border border-sky-100 bg-sky-50 p-4">
            <h4 className="mb-1.5 text-sm font-semibold text-sky-800">Practical Takeaway</h4>
            <p className="text-sm leading-relaxed text-sky-900/80">{takeaway}</p>
          </div>
        )}
      </div>
    </div>
  );
}
