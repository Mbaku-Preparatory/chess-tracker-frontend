import { configureStore } from "@reduxjs/toolkit";

import authReducer from "./slices/authSlice";
import gamesReducer from "./slices/gamesSlice";
import playerDetailReducer from "./slices/playerDetailSlice";
import playersReducer from "./slices/playersSlice";
import themeReducer from "./slices/themeSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    players: playersReducer,
    playerDetail: playerDetailReducer,
    games: gamesReducer,
    theme: themeReducer,
  },
  // No preloadedState — store always starts with defaults on both server and
});


export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
