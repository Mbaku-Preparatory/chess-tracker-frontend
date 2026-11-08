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


/** Instagram's story size, which a phone shares to Instagram as a picture. */
export const STORY_SIZE = { width: 1080, height: 1920 };

/**
 * A type as a story picture: what the Instagram button shares, since Instagram
 * takes no links from the web, only pictures. Same rules as the preview card:
 * text and shapes, no chess symbols.
 */
export function personalityStory(type: PersonalityType) {
  const bare = type.name.replace(/^The /, "");
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#f6f6f9", color: "#171721" }}>
        <div style={{ height: 820, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: type.colour, color: "#fff" }}>
          <div style={{ fontSize: 40, letterSpacing: 8, textTransform: "uppercase", opacity: 0.85 }}>My chess personality</div>
          <div style={{ marginTop: 60, width: 360, height: 360, borderRadius: 180, border: "10px solid rgba(255,255,255,0.45)", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.12)", fontSize: 180, fontWeight: 700 }}>
            {bare[0]}
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "90px 80px 0", textAlign: "center" }}>
          <div style={{ fontSize: 56, color: "#4a4a58" }}>I&apos;m</div>
          <div style={{ marginTop: 10, fontSize: 128, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>{type.name}</div>
          <div style={{ marginTop: 40, fontSize: 50, color: "#4a4a58", lineHeight: 1.3 }}>{type.tagline}</div>
          <div style={{ marginTop: "auto", marginBottom: 120, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 46, fontWeight: 700 }}>Which chess personality are you?</div>
            <div style={{ marginTop: 18, fontSize: 40, color: "#5c7a33" }}>chesspreparatory.com/chess-personality</div>
          </div>
        </div>
      </div>
    ),
    STORY_SIZE,
  );
}
