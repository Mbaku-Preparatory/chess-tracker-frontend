import type {
  ChessComImportResult,
  LichessImportResult,
  Game,
  GamesFilter,
  OpeningDistribution,
  OpeningStat,
  PaginatedResponse,
  PerformanceSummary,
  Player,
  PlayerDetail,
  PlayerInsights,
  PrepData,
} from "@/types";

const rawApiBase =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000/api";

const normalizedApiBase = rawApiBase.replace(/\/$/, "");
const API_BASE = normalizedApiBase.endsWith("/api")
  ? normalizedApiBase
  : `${normalizedApiBase}/api`;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const msg = body?.detail || `API error: ${res.status} ${res.statusText}`;
    const err = new Error(msg);
    (err as any).status = res.status;
    (err as any).body = body;
    throw err;
  }
  return res.json();
}

export const api = {
  getPlayers(search?: string, page?: number): Promise<PaginatedResponse<Player>> {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (page && page > 1) params.set("page", String(page));
    return fetchJson(`${API_BASE}/players/?${params}`);
  },

  getPlayerDetail(slug: string): Promise<PlayerDetail> {
    return fetchJson(`${API_BASE}/players/${slug}/`);
  },

  getPlayerGames(slug: string, filters?: GamesFilter): Promise<PaginatedResponse<Game>> {
    const params = new URLSearchParams();
    if (filters?.color_played) params.set("color_played", filters.color_played);
    if (filters?.result) params.set("result", filters.result);
    if (filters?.eco_code) params.set("eco_code", filters.eco_code);
    if (filters?.opening_family) params.set("opening_family", filters.opening_family);
    if (filters?.search) params.set("search", filters.search);
    if (filters?.page) params.set("page", String(filters.page));
    return fetchJson(`${API_BASE}/players/${slug}/games/?${params}`);
  },

  getPlayerOpenings(slug: string): Promise<OpeningStat[]> {
    return fetchJson(`${API_BASE}/players/${slug}/openings/`);
  },

  getPlayerPrep(slug: string): Promise<PrepData> {
    return fetchJson(`${API_BASE}/players/${slug}/prep/`);
  },

  getPlayerSummary(slug: string): Promise<PerformanceSummary> {
    return fetchJson(`${API_BASE}/players/${slug}/summary/`);
  },

  getPlayerOpeningDistribution(slug: string): Promise<OpeningDistribution> {
    return fetchJson(`${API_BASE}/players/${slug}/opening-distribution/`);
  },

  importPGN(payload: {
    pgn_text: string;
    mode: "self" | "opponent";
    player_name?: string;
    player_slug?: string;
    color?: "auto" | "white" | "black";
  }): Promise<import("@/types").PGNImportResult> {
    return fetchJson(`${API_BASE}/pgn/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  getGamePgn(id: number): Promise<{ id: number; pgn_text: string }> {
    return fetchJson(`${API_BASE}/games/${id}/pgn/`);
  },

  importFromChessCom(
    slug: string,
    payload: { username?: string; limit?: number }
  ): Promise<ChessComImportResult> {
    return fetchJson(`${API_BASE}/players/${slug}/import-chesscom/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  importFromLichess(
    slug: string,
    payload: { username?: string; limit?: number }
  ): Promise<LichessImportResult> {
    return fetchJson(`${API_BASE}/players/${slug}/import-lichess/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  getPlayerInsights(slug: string, ecoCodes?: string[]): Promise<PlayerInsights> {
    const params = new URLSearchParams();
    if (ecoCodes && ecoCodes.length > 0) {
      params.set("eco_codes", ecoCodes.join(","));
    }
    const qs = params.toString();
    return fetchJson(`${API_BASE}/players/${slug}/insights/${qs ? `?${qs}` : ""}`);
  },

  searchOpenings(query: string, limit = 20): Promise<import("@/types").OpeningResult[]> {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    return fetchJson(`${API_BASE}/openings/search/?${params}`);
  },

};
