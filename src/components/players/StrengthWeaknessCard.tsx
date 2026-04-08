import type { Strength, Weakness } from "@/types";

interface StrengthWeaknessCardProps {
  items: (Strength | Weakness)[];
  type: "strength" | "weakness";
  eyebrow?: string;
  title?: string;
}

export function StrengthWeaknessCard({
  items,
  type,
  eyebrow,
  title,
}: StrengthWeaknessCardProps) {
  const isStrength = type === "strength";

  return (
    <div className="card overflow-hidden">
      <div
        className={`border-b px-5 py-4 ${
          isStrength
            ? "border-emerald-100 bg-emerald-50/50"
            : "border-red-100 bg-red-50/50"
        }`}
      >
        {eyebrow && (
          <p
            className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
              isStrength ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {eyebrow}
          </p>
        )}
        <h3 className="font-semibold text-gray-900">
          {title || (isStrength ? "Strengths" : "Weaknesses")}
        </h3>
      </div>
      <ul className="divide-y divide-gray-50">
        {items.map((item) => (
          <li key={item.id} className="px-5 py-3.5">
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs ${
                  isStrength
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {isStrength ? "+" : "-"}
              </span>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {item.title}
                </p>
                {item.description && (
                  <p className="mt-1 text-sm text-gray-500">
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
