/**
 * What a visitor without an account gets on the public site, in one place.
 *
 * Counted in this browser's storage, like the guest book trial
 * (lib/guestBook.ts): a soft limit for a person, not a wall against a script.
 * A private window starts again; that is accepted, because a server-side count
 * per address would lock out a whole Kenyan mobile network sharing one IP, and
 * would stop the public pages being cached. The backend separately refuses
 * more than PUBLIC_GAMES_SHOWN games of a profile, so that one is not soft.
 *
 * Search engines start with empty storage on every visit, so they always see
 * a profile in full.
 */

/** Games against a player's bot on /chess-bot. */
export const FREE_BOT_GAMES = 5;
/** Different player profiles opened. Opening one of them again is free. */
export const FREE_PROFILE_VIEWS = 5;
/** A profile's games shown publicly, newest first. The backend's
 * PUBLIC_GAMES_LIMIT (players/public_schema.py) is the same number. */
export const PUBLIC_GAMES_SHOWN = 10;

const BOT_KEY = "cs_free_bot_games";
// The single free game's record before there were five. Counts as one played.
const OLD_BOT_KEY = "cs_free_bot";
const PROFILES_KEY = "cs_free_profiles";

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or blocked storage: nothing is counted, and the page works.
  }
}

type BotGames = { played: number; last: string | null };

/** Free bot games played in this browser, and against whom the last was. */
export function freeBotGames(): BotGames {
  const saved = read<BotGames>(BOT_KEY);
  if (saved && Number.isFinite(saved.played)) return saved;
  const old = read<{ name?: string }>(OLD_BOT_KEY);
  return old ? { played: 1, last: old.name ?? null } : { played: 0, last: null };
}

/** Count one more free bot game; returns the new total. */
export function countFreeBotGame(name: string): number {
  const played = freeBotGames().played + 1;
  write(BOT_KEY, { played, last: name });
  return played;
}

/**
 * Note a visit to a profile. True when it is within the free views: a
 * profile already opened, or a new one while fewer than FREE_PROFILE_VIEWS
 * have been. False means this one is over the limit (and is not recorded).
 */
export function allowProfileView(fideId: string): boolean {
  const seen = read<string[]>(PROFILES_KEY) ?? [];
  if (seen.includes(fideId)) return true;
  if (seen.length >= FREE_PROFILE_VIEWS) return false;
  write(PROFILES_KEY, [...seen, fideId]);
  return true;
}
