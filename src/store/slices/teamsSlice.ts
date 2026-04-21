import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { api } from "@/lib/api";
import type { Team } from "@/types";

interface TeamsState {
  items: Team[];
  loading: boolean;
  error: string | null;
}

const initialState: TeamsState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchTeams = createAsyncThunk("teams/fetchTeams", async () => {
  return api.getTeams();
});

const teamsSlice = createSlice({
  name: "teams",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeams.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeams.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchTeams.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch teams";
      });
  },
});

export default teamsSlice.reducer;
