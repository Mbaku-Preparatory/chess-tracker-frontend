import type {
  AccountDelinkResult,
  AccountGamesDeleteResult,
  ChessComImportResult,
  ChessResultsImportResult,
  LichessImportResult,
  Game,
  GamesFilter,
  OpeningDistribution,
  OpeningStat,
  PaginatedResponse,
  PerformanceSummary,
  Player,
  PlayerAccount,
  PlayerDetail,
  PlayerInsights,
  PlayerLookupResult,
  RepertoireData,
} from "@/types";
import { authStorage } from "@/lib/auth";
import { requestTracker } from "@/lib/request-tracker";

const rawApiBase =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000/api";

const normalizedApiBase = rawApiBase.replace(/\/$/, "");
const API_BASE = normalizedApiBase.endsWith("/api")
  ? normalizedApiBase
  : `${normalizedApiBase}/api`;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const token = authStorage.getToken();
  const authHeader: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};
  requestTracker.increment();
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        ...authHeader,
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const msg = body?.detail || `API error: ${res.status} ${res.statusText}`;
      const err = new Error(msg);
      (err as any).status = res.status;
      (err as any).body = body;
      throw err;
    }
    if (res.status === 204) {
      return undefined as T;
    }
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return undefined as T;
    }
    return res.json();
  } finally {
    requestTracker.decrement();
  }
}

export const api = {
  getPlayers(search?: string, page?: number, ordering?: string): Promise<PaginatedResponse<Player>> {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (page && page > 1) params.set("page", String(page));
    if (ordering) params.set("ordering", ordering);
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
    if (filters?.source) params.set("source", filters.source);
    if (filters?.search) params.set("search", filters.search);
    if (filters?.year) params.set("year", filters.year);
    if (filters?.page) params.set("page", String(filters.page));
    return fetchJson(`${API_BASE}/players/${slug}/games/?${params}`);
  },

  getPlayerOpenings(
    slug: string,
    source?: string,
    result?: string,
    year?: string,
  ): Promise<OpeningStat[]> {
    const params = new URLSearchParams();
    if (source) params.set("source", source);
    if (result) params.set("result", result);
    if (year) params.set("year", year);
    const qs = params.toString();
    return fetchJson(`${API_BASE}/players/${slug}/openings/${qs ? `?${qs}` : ""}`);
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

  importFromChessResults(
    slug: string,
    payload: { url: string }
  ): Promise<ChessResultsImportResult> {
    return fetchJson(`${API_BASE}/players/${slug}/import-chess-results/`, {
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

  getRepertoire(): Promise<RepertoireData> {
    return fetchJson(`${API_BASE}/repertoire/`);
  },

  saveRepertoire(data: Omit<RepertoireData, "updated_at">): Promise<RepertoireData> {
    return fetchJson(`${API_BASE}/repertoire/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  searchOpenings(query: string, limit = 20): Promise<import("@/types").OpeningResult[]> {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    return fetchJson(`${API_BASE}/openings/search/?${params}`);
  },

  // ── Auth ─────────────────────────────────────────────────────────────────

  register(
    email: string,
    password: string
  ): Promise<{ access: string; refresh: string; email: string }> {
    return fetchJson(`${API_BASE}/auth/register/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  },

  login(
    email: string,
    password: string
  ): Promise<{ access: string; refresh: string; email: string }> {
    return fetchJson(`${API_BASE}/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  },

  // ── Player lookup (search to pre-fill add-opponent form) ─────────────────

  lookupPlayer(
    platform: "chesscom" | "lichess" | "fide",
    q: string
  ): Promise<{ platform: string; results: PlayerLookupResult[] }> {
    const params = new URLSearchParams({ platform, q });
    return fetchJson(`${API_BASE}/players/lookup/?${params}`);
  },

  // ── Player create ─────────────────────────────────────────────────────────

  syncFide(slug: string): Promise<{
    updated_fields: string[];
    full_name: string;
    standard_rating: number | null;
    rapid_rating: number | null;
    blitz_rating: number | null;
    title: string | null;
    birth_year: number | null;
  }> {
    return fetchJson(`${API_BASE}/players/${slug}/sync-fide/`, { method: "POST" });
  },

  createPlayer(payload: {
    full_name: string;
    federation?: string;
    fide_id?: string;
    accounts?: { platform: "chesscom" | "lichess"; username: string }[];
  }): Promise<{ id: number; public_id: string; full_name: string; slug: string }> {
    return fetchJson(`${API_BASE}/players/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  // ── Player accounts ───────────────────────────────────────────────────────

  getAccounts(slug: string): Promise<PlayerAccount[]> {
    return fetchJson(`${API_BASE}/players/${slug}/accounts/`);
  },

  addAccount(slug: string, platform: "chesscom" | "lichess", username: string): Promise<PlayerAccount> {
    return fetchJson(`${API_BASE}/players/${slug}/accounts/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, username }),
    });
  },

  removeAccount(
    slug: string,
    accountId: number,
    options?: { deleteGames?: boolean }
  ): Promise<AccountDelinkResult> {
    const params = new URLSearchParams();
    if (options?.deleteGames) params.set("delete_games", "1");
    const qs = params.toString();
    return fetchJson(
      `${API_BASE}/players/${slug}/accounts/${accountId}/${qs ? `?${qs}` : ""}`,
      { method: "DELETE" }
    );
  },

  deleteImportedGamesForAccount(
    slug: string,
    accountId: number
  ): Promise<AccountGamesDeleteResult> {
    return fetchJson(`${API_BASE}/players/${slug}/accounts/${accountId}/games/`, {
      method: "DELETE",
    });
  },

  deletePlayer(slug: string): Promise<void> {
    return fetchJson(`${API_BASE}/players/${slug}/`, { method: "DELETE" });
  },
};
