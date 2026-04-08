import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { api } from "@/lib/api";
import type { Player } from "@/types";

interface PlayersState {
  items: Player[];
  total: number;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  currentPage: number;
}

const initialState: PlayersState = {
  items: [],
  total: 0,
  loading: false,
  error: null,
  searchQuery: "",
  currentPage: 1,
};

export const fetchPlayers = createAsyncThunk(
  "players/fetchPlayers",
  async ({ search, page }: { search?: string; page?: number } = {}) => {
    return api.getPlayers(search, page);
  }
);

const playersSlice = createSlice({
  name: "players",
  initialState,
  reducers: {
    setSearchQuery(state, action) {
      state.searchQuery = action.payload;
      state.currentPage = 1;
    },
    setCurrentPage(state, action) {
      state.currentPage = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlayers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPlayers.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.results;
        state.total = action.payload.count;
      })
      .addCase(fetchPlayers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch players";
      });
  },
});

export const { setSearchQuery, setCurrentPage } = playersSlice.actions;
export default playersSlice.reducer;
