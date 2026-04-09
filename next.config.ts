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
