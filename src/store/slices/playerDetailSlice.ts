import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { api } from "@/lib/api";
import type { PlayerDetail } from "@/types";

interface PlayerDetailState {
  player: PlayerDetail | null;
  loading: boolean;
  error: string | null;
}

const initialState: PlayerDetailState = {
  player: null,
  loading: false,
  error: null,
};

export const fetchPlayerDetail = createAsyncThunk(
  "playerDetail/fetchDetail",
  async (slug: string) => {
    return api.getPlayerDetail(slug);
  }
);

const playerDetailSlice = createSlice({
  name: "playerDetail",
  initialState,
  reducers: {
    clearPlayerDetail(state) {
      state.player = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlayerDetail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPlayerDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.player = action.payload;
      })
      .addCase(fetchPlayerDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch player";
      });
  },
});

export const { clearPlayerDetail } = playerDetailSlice.actions;
export default playerDetailSlice.reducer;
