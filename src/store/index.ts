import { configureStore } from "@reduxjs/toolkit";

import gamesReducer from "./slices/gamesSlice";
import playerDetailReducer from "./slices/playerDetailSlice";
import playersReducer from "./slices/playersSlice";
import repertoireReducer, { STORAGE_KEY } from "./slices/repertoireSlice";

export const store = configureStore({
  reducer: {
    players: playersReducer,
    playerDetail: playerDetailReducer,
    games: gamesReducer,
    repertoire: repertoireReducer,
  },
  // No preloadedState — store always starts with defaults on both server and
  // client. localStorage is loaded client-side via loadRepertoireFromStorage.
});

// Persist repertoire to localStorage on state change.
// Exclude `initialized` — it is a runtime-only flag and must not be restored.
store.subscribe(() => {
  if (typeof window === "undefined") return;
  const { repertoire } = store.getState();
  if (!repertoire.initialized) return; // Don't overwrite storage before we've read it
  const { initialized: _, ...persistable } = repertoire;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
  } catch {
    // Storage full or unavailable — silently skip
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
