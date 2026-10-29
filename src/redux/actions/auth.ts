import {
  CLEAR_AUTH,
  LOAD_AUTH,
  SET_AUTH,
} from "./actionTypes";

export const loadAuthFromStorage = () => ({ type: LOAD_AUTH });

export const setAuth = (payload: { token: string; refreshToken?: string; email: string }) => ({
  type: SET_AUTH,
  payload,
});

export const clearAuth = () => ({ type: CLEAR_AUTH });
