export interface PlayerAccount {
  id: number;
  platform: "chesscom" | "lichess";
  username: string;
}

export interface PlayerLookupResult {
  platform: "chesscom" | "lichess" | "fide";
  username?: string;       // chess.com / lichess
  fide_id?: string;        // fide
  display_name: string;
  title: string | null;
  avatar_url: string | null;
  ratings?: {
    bullet?: number;
    blitz?: number;
    rapid?: number;
    classical?: number;
    standard?: number;
  };
  country?: string | null;
  federation?: string | null;
}

export type ColorChoice = "white" | "black";
export type GameResult = "win" | "draw" | "loss";
export type GameSource = "manual" | "pgn_import" | "lichess" | "chess_com" | "chess_results";

export interface Player {
  id: number;
  full_name: string;
  slug: string;
  fide_id: string | null;
  chesscom_username: string | null;
  lichess_username: string | null;
  federation: string | null;
  birth_year: number | null;
  standard_rating: number | null;
  rapid_rating: number | null;
  blitz_rating: number | null;
  title: string | null;
  bio: string;
  profile_image: string | null;
  accounts: PlayerAccount[];
  games_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface OpeningStat {
  id: number;
  color_choice: ColorChoice;
  eco_code: string;
  opening_name: string;
  games_count: number;
  score_percent: number | null;
}

export interface PerformanceSummary {
  id: number;
  total_games: number;
  wins: number;
  draws: number;
  losses: number;
  win_rate: number;
  white_games: number;
  white_score: number;
  black_games: number;
  black_score: number;
  summary_text: string;
}

export interface Strength {
  id: number;
  title: string;
  description: string;
  order: number;
}

export interface Weakness {
  id: number;
  title: string;
  description: string;
  order: number;
}

export interface PrepRecommendation {
  id: number;
  scenario_title: string;
  description: string;
  order: number;
}

export interface Game {
  id: number;
  event: string;
  site: string;
  round: string;
  date_played: string | null;
  opponent_name: string;
  opponent_rating: number | null;
  color_played: ColorChoice;
  result: GameResult;
  eco_code: string | null;
  opening_name: string | null;
  opening_family: string | null;
  num_moves: number | null;
  time_control: string | null;
  moves_preview: string;
  pgn_text?: string;
  source: GameSource;
  source_url: string | null;
  notes: string | null;
}

export interface PlayerDetail extends Player {
  performance_summary: PerformanceSummary | null;
  strengths: Strength[];
  weaknesses: Weakness[];
  prep_recommendations: PrepRecommendation[];
  opening_stats: OpeningStat[];
  recent_games: Game[];
}

export type ScoutingSectionType = "win_condition" | "time_pressure" | "common_mistakes" | "quick_prep";

export interface ScoutingSection {
  id: number;
  section_type: ScoutingSectionType;
  title: string;
  content: Record<string, any>;
  order: number;
}

export interface PrepData {
  player: string;
  slug: string;
  bio: string;
  performance_summary: PerformanceSummary | null;
  strengths: Strength[];
  weaknesses: Weakness[];
  prep_recommendations: PrepRecommendation[];
  scouting_sections: ScoutingSection[];
}

export interface OpeningDistribution {
  white: {
    openings: OpeningStat[];
    total_games: number;
  };
  black: {
    openings: OpeningStat[];
    total_games: number;
  };
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface GamesFilter {
  color_played?: ColorChoice | "";
  result?: GameResult | "";
  eco_code?: string;
  opening_family?: string;
  source?: GameSource | "";
  search?: string;
  page?: number;
}

export interface ChessComFetchMeta {
  username: string;
  total_archives: number;
  archives_visited: number;
  archives_failed: number;
  games_fetched: number;
}

export interface ChessComImportResult extends PGNImportResult {
  chesscom_username: string;
  fetch_meta: ChessComFetchMeta;
}

export interface LichessFetchMeta {
  username: string;
  games_fetched: number;
}

export interface LichessImportResult extends PGNImportResult {
  lichess_username: string;
  fetch_meta: LichessFetchMeta;
}

export interface ChessResultsFetchMeta {
  tournament_name: string;
  tournament_url: string;
  source: "pgn" | "pairings";
  total_rounds?: number;
}

export interface ChessResultsImportResult {
  games_imported: number;
  games_skipped: number;
  games_failed: number;
  source_type: "pgn" | "pairings";
  fetch_meta: ChessResultsFetchMeta;
  // PGN path also carries the PGNImportResult fields
  player_slug?: string;
  player_name?: string;
  games_created?: number;
  games_updated?: number;
  opening_summary?: { name: string; count: number; percent: number }[];
  result_summary?: { wins: number; draws: number; losses: number };
}

export interface PGNImportResult {
  player_slug: string;
  player_name: string;
  games_created: number;
  games_updated: number;
  games_imported: number;
  games_skipped: number;
  opening_summary: { name: string; count: number; percent: number }[];
  result_summary: { wins: number; draws: number; losses: number };
}

// ── Phase 4: Insight engine types ───────────────────────────────────────────

export interface InsightMeta {
  player_slug: string;
  player_name: string;
  games_analyzed: number;
  openings_tracked: number;
  repertoire_codes_provided: string[];
  generated_at: string;
  data_quality: "good" | "fair" | "limited" | "none";
}

export interface InsightConfidence {
  score: number;
  label: "High" | "Medium" | "Low" | "Very Low" | "None";
  reason: string;
}

export interface InsightWeakness {
  eco_code: string;
  opening_name: string;
  color: ColorChoice;
  score_percent: number;
  games_count: number;
  severity: "critical" | "high" | "moderate";
  in_your_repertoire: boolean;
  repertoire_match: "exact" | "family" | "";
  description: string;
}

export interface InsightRecommendedLine {
  eco_code: string;
  opening_name: string;
  color: ColorChoice;
  opponent_score: number;
  opponent_games: number;
  repertoire_match: "exact" | "family";
  recommendation_strength: "strong" | "moderate" | "low";
  rationale: string;
}

export interface InsightDangerZone {
  eco_code: string;
  opening_name: string;
  color: ColorChoice;
  score_percent: number;
  games_count: number;
  risk_level: "high" | "medium";
  in_your_repertoire: boolean;
  advice: string;
}

export interface InsightMatchPlanItem {
  order: number;
  type: "target" | "caution" | "consider" | "general";
  text: string;
}

export interface InsightEvidence {
  total_games: number;
  white_games: number;
  black_games: number;
  win_rate: number;
  white_score: number;
  black_score: number;
  top_openings: { eco_code: string; opening_name: string; color: string; games_count: number; score_percent: number }[];
  worst_openings: { eco_code: string; opening_name: string; color: string; games_count: number; score_percent: number }[];
  best_openings: { eco_code: string; opening_name: string; color: string; games_count: number; score_percent: number }[];
}

export interface PlayerInsights {
  meta: InsightMeta;
  confidence: InsightConfidence;
  executive_summary: string;
  recommended_lines: InsightRecommendedLine[];
  weaknesses: InsightWeakness[];
  danger_zones: InsightDangerZone[];
  match_plan: InsightMatchPlanItem[];
  evidence: InsightEvidence;
}

export interface OpeningResult {
  slug: string;
  name: string;
  eco_code: string;
  family: string;
  variation: string;
  pgn: string;
  uci: string;
  epd: string;
}
