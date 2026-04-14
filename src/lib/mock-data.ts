import type { PlayerDetail, PrepData, Game, PaginatedResponse, Player } from "@/types";

const mwabuDetail: PlayerDetail = {
  id: 1,
  full_name: "Timothy Mwabu",
  slug: "timothy-mwabu",
  fide_id: "10805796",
  chesscom_username: null,
  lichess_username: null,
  accounts: [],
  federation: "Kenya",
  birth_year: 2003,
  standard_rating: 1871,
  rapid_rating: 1741,
  blitz_rating: 1955,
  title: null,
  bio: "Timothy Mwabu is a Kenyan chess player with a tactically sharp style and a noticeably stronger public record with Black than with White.",
  profile_image: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  performance_summary: {
    id: 1,
    total_games: 20,
    wins: 10,
    draws: 3,
    losses: 7,
    win_rate: 57.5,
    white_games: 10,
    white_score: 35.0,
    black_games: 10,
    black_score: 80.0,
    summary_text:
      "Mwabu's recovered public sample reveals a stark color split: 80% score with Black versus 35% with White.",
  },
  strengths: [
    { id: 1, title: "Strong tactical play in dynamic Sicilian positions", description: "", order: 1 },
    { id: 2, title: "Comfortable with ...g6 Sicilian setups and central counterplay", description: "", order: 2 },
    { id: 3, title: "Capable of direct king attacks and exchange-sacrifice motifs", description: "", order: 3 },
    { id: 4, title: "Solid practical results with Black", description: "", order: 4 },
  ],
  weaknesses: [
    { id: 1, title: "Underperforms as White in QGD / Slav / Semi-Slav structures", description: "", order: 1 },
    { id: 2, title: "Can overextend with e4/e5 or kingside expansion as White", description: "", order: 2 },
    { id: 3, title: "Discomfort against early kingside pawn storms in d4 structures", description: "", order: 3 },
    { id: 4, title: "Some forcing calculation failures in sharp lines", description: "", order: 4 },
  ],
  prep_recommendations: [
    { id: 1, scenario_title: "Against Mwabu as Black: use Anti-Sicilian or Maroczy Bind", description: "", order: 1 },
    { id: 2, scenario_title: "Against Mwabu as White: consider Slav / Semi-Slav", description: "", order: 2 },
    { id: 3, scenario_title: "Be alert for dark-square tactics and exchange sacrifices", description: "", order: 3 },
    { id: 4, scenario_title: "Prefer positions where he must defend patiently", description: "", order: 4 },
  ],
  opening_stats: [
    { id: 1, color_choice: "white", eco_code: "D46", opening_name: "Semi-Slav Defense", games_count: 3, score_percent: 33.3 },
    { id: 2, color_choice: "black", eco_code: "B23", opening_name: "Sicilian Closed ...g6", games_count: 2, score_percent: 100.0 },
    { id: 3, color_choice: "black", eco_code: "B34", opening_name: "Accelerated Dragon", games_count: 2, score_percent: 75.0 },
  ],
  recent_games: [
    {
      id: 1,
      event: "Kenya National Chess Championship",
      site: "",
      round: "2",
      date_played: "2024-08-12",
      opponent_name: "Peter Wanjiku",
      opponent_rating: null,
      color_played: "black",
      result: "win",
      eco_code: "B23",
      opening_name: "Sicilian Defense: Closed, ...g6",
      opening_family: "Sicilian",
      num_moves: 42,
      time_control: null,
      moves_preview: "1.e4 c5 2.Nc3 g6",
      source: "manual",
      source_url: null,
      notes: null,
    },
  ],
};

export const mockPlayers: PaginatedResponse<Player> = {
  count: 1,
  next: null,
  previous: null,
  results: [mwabuDetail],
};

export const mockPlayerDetail = mwabuDetail;

export const mockGames: PaginatedResponse<Game> = {
  count: 1,
  next: null,
  previous: null,
  results: mwabuDetail.recent_games,
};

export const mockPrepData: PrepData = {
  player: mwabuDetail.full_name,
  slug: mwabuDetail.slug,
  bio: mwabuDetail.bio,
  performance_summary: mwabuDetail.performance_summary,
  strengths: mwabuDetail.strengths,
  weaknesses: mwabuDetail.weaknesses,
  prep_recommendations: mwabuDetail.prep_recommendations,
  scouting_sections: [
    {
      id: 1,
      section_type: "win_condition",
      title: "How You Beat This Player",
      order: 1,
      content: {
        intro: "Use the color split, not generic theory.",
        as_white: {
          heading: "If You Are White Against Mwabu",
          points: [
            "Avoid open Sicilian chaos if you are not prepared.",
            "Choose Anti-Sicilian or slower structures.",
            "Trade the dark-squared bishop when possible.",
          ],
        },
        as_black: {
          heading: "If You Are Black Against Mwabu",
          points: [
            "Challenge him in Slav or QGD structures.",
            "Stay solid and punish overextension.",
            "Keep the game positional when you are better.",
          ],
        },
      },
    },
    {
      id: 2,
      section_type: "common_mistakes",
      title: "Common Mistakes Against Mwabu",
      order: 2,
      content: {
        intro: "Do not make his game easier.",
        avoid: [
          "Entering his preferred tactical mess.",
          "Allowing easy ...g6 Sicilian comfort.",
          "Playing passively with Black.",
        ],
        do_instead: [
          "Slow the game down.",
          "Attack long-term weaknesses.",
          "Deny easy attacking targets.",
        ],
      },
    },
    {
      id: 3,
      section_type: "quick_prep",
      title: "30-Second Prep Mode",
      order: 3,
      content: {
        intro: "Read this right before round start.",
        bullets: [
          "He is much stronger with Black than White.",
          "As White, avoid gifting him tactical Sicilian play.",
          "As Black, stay solid and wait for overextension.",
        ],
      },
    },
  ],
};
