/**
 * The browser half of "Continue with Lichess" (the backend half is
 * users/lichess_oauth.py).
 *
 * Lichess's OAuth needs no registration. We send the person to Lichess with a
 * hash of a secret we keep (PKCE), Lichess sends them back to /auth/lichess
 * with a one-time code, and the backend swaps the code plus the secret for who
 * they are. Someone who intercepts the code cannot use it without the secret.
 *
 * `state` is a second random value, checked on the way back, so a code from a
 * sign-in somebody else started (a link planted in an email, say) is refused
 * instead of signing this browser in to their account.
 */

const KEY = "cs_lichess_oauth";
const LICHESS_OAUTH = "https://lichess.org/oauth";
/** Must match CLIENT_ID in the backend's users/lichess_oauth.py. */
const CLIENT_ID = "chesspreparatory.com";

/** Signing in (from /login or /signup), or linking from Settings. */
export type LichessMode = "signin" | "connect";

interface Pending {
  verifier: string;
  state: string;
  mode: LichessMode;
  redirectUri: string;
}

function base64url(bytes: Uint8Array): string {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const random = (n: number) => base64url(crypto.getRandomValues(new Uint8Array(n)));

/** Sends this tab to Lichess's "authorize" page. */
export async function startLichess(mode: LichessMode): Promise<void> {
  const verifier = random(32);
  const state = random(16);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  // Wherever the site is running (production, a preview, localhost): Lichess
  // takes any return address, and only sends the code back to the one given.
  const redirectUri = `${window.location.origin}/auth/lichess`;
  const pending: Pending = { verifier, state, mode, redirectUri };
  sessionStorage.setItem(KEY, JSON.stringify(pending));

  const query = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    code_challenge_method: "S256",
    code_challenge: base64url(new Uint8Array(digest)),
    scope: "email:read",
    state,
  });
  window.location.assign(`${LICHESS_OAUTH}?${query}`);
}

/**
 * The sign-in this tab started, if `state` is the one it sent. Read once:
 * a code is single-use, and so is the secret that goes with it.
 */
export function takePendingLichess(state: string | null): Pending | null {
  let pending: Pending | null = null;
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    pending = raw ? (JSON.parse(raw) as Pending) : null;
  } catch {
    return null;
  }
  if (!pending || !state || pending.state !== state) return null;
  return pending;
}
