import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { api } from "@/lib/api";

export interface RepertoireOpening {
  slug: string;
  name: string;
  eco_code: string;
  family: string;
  variation: string;
  pgn: string;
  uci: string;
  epd: string;
}

export type RepertoireSection = "white" | "black";

interface RepertoireState {
  white: RepertoireOpening[];
  black: RepertoireOpening[];
  onboardingComplete: boolean;
  /**
   * False until fetchRepertoire has resolved. Guards Gate 2 in AuthGate
   * so we don't redirect to /setup before we know the actual state.
   */
  initialized: boolean;
  saving: boolean;
}

const initialState: RepertoireState = {
  white: [],
  black: [],
  onboardingComplete: false,
  initialized: false,
  saving: false,
};

/** Load repertoire from the API. Dispatched once after auth is confirmed. */
export const fetchRepertoire = createAsyncThunk(
  "repertoire/fetch",
  async () => {
    return await api.getRepertoire();
  }
);

/** Persist the current repertoire state to the API. */
export const saveRepertoire = createAsyncThunk(
  "repertoire/save",
  async (_, { getState }) => {
    const { repertoire } = getState() as { repertoire: RepertoireState };
    return await api.saveRepertoire({
      white: repertoire.white,
      black: repertoire.black,
      onboarding_complete: repertoire.onboardingComplete,
    });
  }
);

const repertoireSlice = createSlice({
  name: "repertoire",
  initialState,
  reducers: {
    addOpening(
      state,
      action: PayloadAction<{ section: RepertoireSection; opening: RepertoireOpening }>
    ) {
      const { section, opening } = action.payload;
      if (state[section].some((o) => o.slug === opening.slug)) return;
      state[section] = [...state[section], opening];
    },
    removeOpening(
      state,
      action: PayloadAction<{ section: RepertoireSection; slug: string }>
    ) {
      const { section, slug } = action.payload;
      state[section] = state[section].filter((o) => o.slug !== slug);
    },
    completeOnboarding(state) {
      state.onboardingComplete = true;
    },
    resetRepertoire(state) {
      state.white = [];
      state.black = [];
      state.onboardingComplete = false;
    },
    /** Mark as initialized without fetching — used when the user is not authenticated. */
    setInitialized(state) {
      state.initialized = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRepertoire.fulfilled, (state, action) => {
        state.white = action.payload.white ?? [];
        state.black = action.payload.black ?? [];
        state.onboardingComplete = action.payload.onboarding_complete ?? false;
        state.initialized = true;
      })
      .addCase(fetchRepertoire.rejected, (state) => {
        // Network error or 404 — treat as empty, let the user proceed
        state.initialized = true;
      })
      .addCase(saveRepertoire.pending, (state) => {
        state.saving = true;
      })
      .addCase(saveRepertoire.fulfilled, (state) => {
        state.saving = false;
      })
      .addCase(saveRepertoire.rejected, (state) => {
        state.saving = false;
      });
  },
});

export const {
  addOpening,
  removeOpening,
  completeOnboarding,
  resetRepertoire,
  setInitialized,
} = repertoireSlice.actions;

export default repertoireSlice.reducer;
