import { ImageResponse } from "next/og";

// One picture for every shared result: the share text carries the score, and
// a per-result image would need the server per share.
export const alt = "Guess the player";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ROWS = [
  ["#c92a2a", "#2f9e44", "#e8a400", "#c92a2a"],
  ["#e8a400", "#2f9e44", "#e8a400", "#e8a400"],
  ["#2f9e44", "#2f9e44", "#2f9e44", "#2f9e44"],
];

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", padding: "0 90px", background: "#f6f6f9", color: "#171721" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 30, letterSpacing: 4, textTransform: "uppercase", color: "#5c7a33" }}>Daily chess puzzle</div>
          <div style={{ marginTop: 16, fontSize: 92, fontWeight: 700, letterSpacing: -1.5, lineHeight: 1.05 }}>Guess the player</div>
          <div style={{ marginTop: 22, fontSize: 34, color: "#4a4a58" }}>A mystery FIDE player every day. Eight guesses.</div>
          <div style={{ marginTop: 40, fontSize: 28, color: "#7a7a88" }}>chesspreparatory.com</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {ROWS.map((row, i) => (
            <div key={i} style={{ display: "flex", gap: 14 }}>
              {row.map((c, j) => (
                <div key={j} style={{ width: 84, height: 84, borderRadius: 14, background: c }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
