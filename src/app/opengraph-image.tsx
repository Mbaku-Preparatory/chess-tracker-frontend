import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

// One picture for every shared link. Rendered at build time, not per
// profile: a per-player image would be a function run for each of the ~444k
// profiles crawlers fetch, for a preview most of them never show.
export const alt = "Chess Preparatory";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  // The generated mark (tools/logo), never redrawn here.
  const logo = await readFile(join(process.cwd(), "public/logo.svg"), "base64");
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: "#f6f6f9",
          color: "#171721",
        }}
      >
        <img src={`data:image/svg+xml;base64,${logo}`} width={175} height={160} alt="" />
        <div style={{ marginTop: 40, fontSize: 76, fontWeight: 700, letterSpacing: -1.5 }}>Chess Preparatory</div>
        <div style={{ marginTop: 16, fontSize: 36, color: "#4a4a58" }}>
          FIDE player ratings, history and games
        </div>
        <div style={{ marginTop: 48, height: 8, width: 120, borderRadius: 4, background: "#5c7a33" }} />
      </div>
    ),
    size,
  );
}
