"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { api } from "@/lib/api";
import { useAppSelector } from "@/redux/hooks";
import type { Preferences } from "@/types";

/** What a page assumes until the account's answer arrives: the server's defaults. */
export const DEFAULT_PREFERENCES: Preferences = { mbaku_enabled: false, bot_speech: true, import_emails: false };

interface PreferencesContext {
  preferences: Preferences;
  /** False until the account's own choices have loaded. */
  loaded: boolean;
  /** Saves at once and shows it at once; put back if the save fails. */
  update: (change: Partial<Preferences>) => Promise<void>;
  /** The account's avatar (lib/avatars), or null for the default. */
  avatar: number | null;
  /** Tell the shell about an avatar saved elsewhere (settings, the bot page). */
  setAvatar: (avatar: number | null) => void;
}

const Context = createContext<PreferencesContext>({
  preferences: DEFAULT_PREFERENCES,
  loaded: false,
  update: async () => {},
  avatar: null,
  setAvatar: () => {},
});

/**
 * The settings switches and the avatar, for every page of the app: read once
 * per sign-in from /auth/me/, and changed from the settings page.
 */
export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const token = useAppSelector((s) => s.auth.token);
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);
  const [avatar, setAvatar] = useState<number | null>(null);

  useEffect(() => {
    if (!token) {
      setPreferences(DEFAULT_PREFERENCES);
      setLoaded(false);
      setAvatar(null);
      return;
    }
    let cancelled = false;
    api
      .getMe()
      .then((me) => {
        if (cancelled) return;
        setPreferences({ ...DEFAULT_PREFERENCES, ...me.preferences });
        setAvatar(me.avatar);
        setLoaded(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token]);

  const update = useCallback(async (change: Partial<Preferences>) => {
    let before: Preferences = DEFAULT_PREFERENCES;
    setPreferences((p) => {
      before = p;
      return { ...p, ...change };
    });
    try {
      const me = await api.setMyPreferences(change);
      setPreferences({ ...DEFAULT_PREFERENCES, ...me.preferences });
    } catch (err) {
      setPreferences(before);
      throw err;
    }
  }, []);

  return <Context.Provider value={{ preferences, loaded, update, avatar, setAvatar }}>{children}</Context.Provider>;
}

export const usePreferences = () => useContext(Context);
