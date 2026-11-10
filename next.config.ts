import type { NextConfig } from "next";

const rawApiBase =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000/api";

const normalizedApiBase = rawApiBase.replace(/\/$/, "");
const apiBase = normalizedApiBase.endsWith("/api")
  ? normalizedApiBase
  : `${normalizedApiBase}/api`;

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Guess the player was removed on 2026-11-10. Shared puzzle links land on
      // the other fun page instead of a 404.
      { source: "/guess-the-player/:path*", destination: "/chess-personality", permanent: true },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiBase}/:path*`,
      },
    ];
  },
};

export default nextConfig;
