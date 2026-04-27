import type { GamesFilter } from "@/types";
import { FETCH_GAMES, RESET_GAMES_FILTERS, SET_GAMES_FILTERS } from "./actionTypes";

export const fetchGames = (payload: { slug: string; filters?: GamesFilter }) => ({
  type: FETCH_GAMES,
  payload,
  errors: null,
});

export const setGamesFilters = (filters: Partial<GamesFilter>) => ({
  type: SET_GAMES_FILTERS,
  payload: filters,
});

export const resetGamesFilters = () => ({ type: RESET_GAMES_FILTERS });
