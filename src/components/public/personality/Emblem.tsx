import type { PersonalityType } from "@/lib/chessPersonality";

/**
 * A type's medallion: its colour, a ring, and a chess piece. Drawn here, no
 * image files. The piece is a Unicode chess symbol with U+FE0E so phones show
 * the plain glyph, not an emoji.
 */
export function Emblem({ type, size = 120 }: { type: PersonalityType; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={`${type.name} emblem`} className="shrink-0">
      <circle cx="60" cy="60" r="58" fill={type.colour} />
      <circle cx="60" cy="60" r="49" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" />
      <circle cx="60" cy="60" r="43" fill="#000" fillOpacity="0.12" />
      <text
        x="60"
        y="62"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="58"
        fill="#fff"
        style={{ fontFamily: '"Segoe UI Symbol", "Apple Symbols", "DejaVu Sans", "Noto Sans Symbols 2", serif' }}
      >
        {`${type.piece}︎`}
      </text>
    </svg>
  );
}
