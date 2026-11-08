import { ImageResponse } from "next/og";

import type { PersonalityType } from "@/lib/chessPersonality";

/**
 * The preview picture a shared chess personality link shows (WhatsApp, X):
 * one per type, and one for the test itself (`null`). Text and shapes only:
 * the default font has no chess symbols, so the medallion carries the type's
 * initial instead of its piece.
 */
export const CARD_SIZE = { width: 1200, height: 630 };

export function personalityCard(type: PersonalityType | null) {
  const colour = type?.colour ?? "#5c7a33";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f6f6f9", color: "#171721" }}>
        <div style={{ width: 360, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: colour }}>
          <div style={{ width: 220, height: 220, borderRadius: 110, border: "6px solid rgba(255,255,255,0.45)", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.12)", color: "#fff", fontSize: 92, fontWeight: 700 }}>
            {type ? type.name.replace(/^The /, "")[0] : "?"}
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 72px" }}>
          <div style={{ fontSize: 30, letterSpacing: 4, textTransform: "uppercase", color: "#5c7a33" }}>Chess personality test</div>
          <div style={{ marginTop: 18, fontSize: 84, fontWeight: 700, letterSpacing: -1.5, lineHeight: 1.05 }}>
            {type ? type.name : "What kind of chess player are you?"}
          </div>
          <div style={{ marginTop: 22, fontSize: 34, color: "#4a4a58", lineHeight: 1.3 }}>
            {type ? type.tagline : "20 quick questions. 16 personalities."}
          </div>
          <div style={{ marginTop: 44, fontSize: 28, color: "#7a7a88" }}>chesspreparatory.com</div>
        </div>
      </div>
    ),
    CARD_SIZE,
  );
}

