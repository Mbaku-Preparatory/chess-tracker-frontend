type BadgeVariant = "default" | "eco" | "win" | "draw" | "loss" | "white" | "black";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
}

const styles: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-700",
  eco: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  win: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  draw: "bg-amber-50 text-amber-700 border border-amber-200",
  loss: "bg-red-50 text-red-700 border border-red-200",
  white: "bg-white text-gray-800 border border-gray-300",
  black: "bg-gray-800 text-white",
};

export function Badge({ label, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${styles[variant]} ${className}`}
    >
      {label}
    </span>
  );
}

export function ResultBadge({ result }: { result: string }) {
  const variant = result as BadgeVariant;
  return <Badge label={result.charAt(0).toUpperCase() + result.slice(1)} variant={variant} />;
}

export function ColorBadge({ color }: { color: string }) {
  return <Badge label={color.charAt(0).toUpperCase() + color.slice(1)} variant={color as BadgeVariant} />;
}

export function EcoBadge({ code }: { code: string }) {
  return <Badge label={code} variant="eco" />;
}
