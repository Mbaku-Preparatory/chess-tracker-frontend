import { configureStore } from "@reduxjs/toolkit";

import authReducer from "./slices/authSlice";
import gamesReducer from "./slices/gamesSlice";
import playerDetailReducer from "./slices/playerDetailSlice";
import playersReducer from "./slices/playersSlice";
import repertoireReducer from "./slices/repertoireSlice";
import themeReducer from "./slices/themeSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    players: playersReducer,
    playerDetail: playerDetailReducer,
    games: gamesReducer,
    repertoire: repertoireReducer,
    theme: themeReducer,
  },
  // No preloadedState — store always starts with defaults on both server and
  // client. Repertoire is fetched from the API via fetchRepertoire once auth resolves.
});


export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
