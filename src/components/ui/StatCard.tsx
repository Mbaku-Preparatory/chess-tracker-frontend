interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  variant?: "default" | "success" | "warning" | "danger";
}

const variantStyles = {
  default: "bg-white dark:bg-dark-surface",
  success: "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800",
  warning: "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800",
  danger: "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800",
};

const valueStyles = {
  default: "text-gray-900 dark:text-gray-100",
  success: "text-emerald-700 dark:text-emerald-400",
  warning: "text-amber-700 dark:text-amber-400",
  danger: "text-red-700 dark:text-red-400",
};

export function StatCard({ label, value, sublabel, variant = "default" }: StatCardProps) {
  return (
    <div className={`card p-5 ${variantStyles[variant]}`}>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${valueStyles[variant]}`}>
        {value}
      </p>
      {sublabel && (
        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{sublabel}</p>
      )}
    </div>
  );
}
