import { T } from "@/components/T";
import { msg } from "@/lib/i18n";

type BadgeVariant = "default" | "eco" | "win" | "draw" | "loss" | "white" | "black";

interface BadgeProps {
  label: React.ReactNode;
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

// The words for a result or a colour, translated where shown; anything else
// the backend sends is shown capitalised, as it comes.
const WORDS: Record<string, string> = { win: msg("Win"), draw: msg("Draw"), loss: msg("Loss"), white: msg("White"), black: msg("Black") };
const word = (value: string) => <T>{WORDS[value] ?? value.charAt(0).toUpperCase() + value.slice(1)}</T>;

export function ResultBadge({ result }: { result: string }) {
  return <Badge label={word(result)} variant={result as BadgeVariant} />;
}

export function ColorBadge({ color }: { color: string }) {
  return <Badge label={word(color)} variant={color as BadgeVariant} />;
}

export function EcoBadge({ code }: { code: string }) {
  return <Badge label={code} variant="eco" />;
}
