interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  variant?: "default" | "success" | "warning" | "danger";
}

const variantStyles = {
  default: "bg-white",
  success: "bg-emerald-50 border-emerald-200",
  warning: "bg-amber-50 border-amber-200",
  danger: "bg-red-50 border-red-200",
};

const valueStyles = {
  default: "text-gray-900",
  success: "text-emerald-700",
  warning: "text-amber-700",
  danger: "text-red-700",
};

export function StatCard({ label, value, sublabel, variant = "default" }: StatCardProps) {
  return (
    <div className={`card p-5 ${variantStyles[variant]}`}>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${valueStyles[variant]}`}>
        {value}
      </p>
      {sublabel && (
        <p className="mt-0.5 text-xs text-gray-400">{sublabel}</p>
      )}
    </div>
  );
}
