export type ColorChoice = "white" | "black";
export type GameResult = "win" | "draw" | "loss";
export type GameSource = "manual" | "pgn_import" | "lichess" | "chess_com";

export interface Player {
  id: number;
  full_name: string;
  slug: string;
  fide_id: string | null;
  federation: string | null;
  birth_year: number | null;
  standard_rating: number | null;
  rapid_rating: number | null;
  blitz_rating: number | null;
  title: string | null;
  bio: string;
  profile_image: string | null;
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

export interface PaymentResponse {
  status: "completed" | "pending" | "failed";
  transaction_id?: string;
  checkout_request_id?: string;
  message?: string;
  detail?: string;
  access?: boolean;
  phone_number?: string;
  amount?: number;
}

export interface AccessCheckResponse {
  access: boolean;
}

export interface GamesFilter {
  color_played?: ColorChoice | "";
  result?: GameResult | "";
  eco_code?: string;
  opening_family?: string;
  search?: string;
  page?: number;
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
