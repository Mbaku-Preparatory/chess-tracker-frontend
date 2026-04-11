import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

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

export type RepertoireSection = "white" | "black_vs_e4" | "black_vs_d4";

interface RepertoireState {
  white: RepertoireOpening[];
  black_vs_e4: RepertoireOpening[];
  black_vs_d4: RepertoireOpening[];
  onboardingComplete: boolean;
  /**
   * Runtime-only flag. False until loadRepertoireFromStorage has fired on the
   * client. Never persisted to localStorage — the subscribe handler omits it.
   */
  initialized: boolean;
}

export const STORAGE_KEY = "cs_repertoire";
const initialState: RepertoireState = {
  white: [],
  black_vs_e4: [],
  black_vs_d4: [],
  onboardingComplete: false,
  initialized: false,
};

const repertoireSlice = createSlice({
  name: "repertoire",
  initialState,
  reducers: {
    loadRepertoireFromStorage(state) {
      if (typeof window === "undefined") return;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const stored = JSON.parse(raw);
          state.white = stored.white ?? [];
          state.black_vs_e4 = stored.black_vs_e4 ?? [];
          state.black_vs_d4 = stored.black_vs_d4 ?? [];
          state.onboardingComplete = stored.onboardingComplete ?? false;
        }
      } catch {
        // Corrupted storage — leave defaults
      }
      state.initialized = true;
    },
    addOpening(
      state,
      action: PayloadAction<{ section: RepertoireSection; opening: RepertoireOpening }>
    ) {
      const { section, opening } = action.payload;
      const sectionItems = state[section];

      if (sectionItems.some((o) => o.slug === opening.slug)) return;

      state[section] = [...sectionItems, opening];
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
      state.black_vs_e4 = [];
      state.black_vs_d4 = [];
      state.onboardingComplete = false;
    },
  },
});

export const {
  loadRepertoireFromStorage,
  addOpening,
  removeOpening,
  completeOnboarding,
  resetRepertoire,
} = repertoireSlice.actions;

export default repertoireSlice.reducer;
