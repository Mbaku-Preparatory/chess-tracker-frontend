import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "@/lib/api";
import type { Pairing, Tournament } from "@/types";

interface TournamentState {
  active: Tournament | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

const initialState: TournamentState = {
  active: null,
  loading: false,
  error: null,
  initialized: false,
};

export const fetchActiveTournament = createAsyncThunk(
  "tournament/fetchActive",
  async () => api.getActiveTournament()
);

export const createTournament = createAsyncThunk(
  "tournament/create",
  async (payload: { name?: string; url?: string }) => api.createTournament(payload)
);

export const upsertPairing = createAsyncThunk(
  "tournament/upsertPairing",
  async ({
    tournamentId,
    pairing,
  }: {
    tournamentId: number;
    pairing: Pick<Pairing, "round_number" | "opponent_name" | "color" | "result">;
  }) => api.upsertPairing(tournamentId, pairing)
);

export const closeTournament = createAsyncThunk(
  "tournament/close",
  async (tournamentId: number) => api.updateTournament(tournamentId, { is_active: false })
);

const tournamentSlice = createSlice({
  name: "tournament",
  initialState,
  reducers: {
    clearTournamentError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchActive
      .addCase(fetchActiveTournament.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActiveTournament.fulfilled, (state, action) => {
        state.loading = false;
        state.active = action.payload;
        state.initialized = true;
      })
      .addCase(fetchActiveTournament.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Failed to load tournament";
        state.initialized = true;
      })
      // create
      .addCase(createTournament.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTournament.fulfilled, (state, action) => {
        state.loading = false;
        state.active = action.payload;
      })
      .addCase(createTournament.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Failed to create tournament";
      })
      // upsertPairing
      .addCase(upsertPairing.fulfilled, (state, action) => {
        if (!state.active) return;
        const idx = state.active.pairings.findIndex(
          (p) => p.round_number === action.payload.round_number
        );
        if (idx >= 0) {
          state.active.pairings[idx] = action.payload;
        } else {
          state.active.pairings = [...state.active.pairings, action.payload].sort(
            (a, b) => a.round_number - b.round_number
          );
        }
      })
      // close
      .addCase(closeTournament.fulfilled, (state) => {
        state.active = null;
      });
  },
});

export const { clearTournamentError } = tournamentSlice.actions;
export default tournamentSlice.reducer;
