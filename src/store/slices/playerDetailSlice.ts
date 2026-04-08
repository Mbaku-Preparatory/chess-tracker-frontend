import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { api } from "@/lib/api";
import type { PlayerDetail, PrepData } from "@/types";

interface PlayerDetailState {
  player: PlayerDetail | null;
  prepData: PrepData | null;
  loading: boolean;
  prepLoading: boolean;
  error: string | null;
  prepError: string | null;
}

const initialState: PlayerDetailState = {
  player: null,
  prepData: null,
  loading: false,
  prepLoading: false,
  error: null,
  prepError: null,
};

export const fetchPlayerDetail = createAsyncThunk(
  "playerDetail/fetchDetail",
  async (slug: string) => {
    return api.getPlayerDetail(slug);
  }
);

export const fetchPlayerPrep = createAsyncThunk(
  "playerDetail/fetchPrep",
  async ({ slug, phone }: { slug: string; phone: string }, { rejectWithValue }) => {
    try {
      return await api.getPlayerPrep(slug, phone);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load prep data.";
      return rejectWithValue(message);
    }
  }
);

const playerDetailSlice = createSlice({
  name: "playerDetail",
  initialState,
  reducers: {
    clearPlayerDetail(state) {
      state.player = null;
      state.prepData = null;
      state.error = null;
      state.prepError = null;
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
      })
      .addCase(fetchPlayerPrep.pending, (state) => {
        state.prepLoading = true;
        state.prepError = null;
        state.prepData = null;
      })
      .addCase(fetchPlayerPrep.fulfilled, (state, action) => {
        state.prepLoading = false;
        state.prepData = action.payload;
      })
      .addCase(fetchPlayerPrep.rejected, (state, action) => {
        state.prepLoading = false;
        state.prepError =
          (action.payload as string) ||
          action.error.message ||
          "Failed to load prep data.";
      });
  },
});

export const { clearPlayerDetail } = playerDetailSlice.actions;
export default playerDetailSlice.reducer;
