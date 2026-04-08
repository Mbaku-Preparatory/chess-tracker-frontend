import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { api } from "@/lib/api";
import type { Game, GamesFilter } from "@/types";

interface GamesState {
  items: Game[];
  total: number;
  loading: boolean;
  error: string | null;
  filters: GamesFilter;
}

const initialState: GamesState = {
  items: [],
  total: 0,
  loading: false,
  error: null,
  filters: {
    color_played: "",
    result: "",
    eco_code: "",
    search: "",
    page: 1,
  },
};

export const fetchGames = createAsyncThunk(
  "games/fetchGames",
  async ({ slug, filters }: { slug: string; filters?: GamesFilter }) => {
    return api.getPlayerGames(slug, filters);
  }
);

const gamesSlice = createSlice({
  name: "games",
  initialState,
  reducers: {
    setGamesFilters(state, action: PayloadAction<Partial<GamesFilter>>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetGamesFilters(state) {
      state.filters = initialState.filters;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGames.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGames.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.results;
        state.total = action.payload.count;
      })
      .addCase(fetchGames.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch games";
      });
  },
});

export const { setGamesFilters, resetGamesFilters } = gamesSlice.actions;
export default gamesSlice.reducer;
