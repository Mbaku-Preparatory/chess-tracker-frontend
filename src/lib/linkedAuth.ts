/**
 * The browser half of "Continue with Lichess" and "Continue with Chess.com"
 * (the backend half is users/lichess_oauth.py and users/chesscom_oauth.py).
 *
 * Both are OAuth with PKCE. We send the person to the site with a hash of a
 * secret we keep, the site sends them back to /auth/<provider> with a one-time
 * code, and the backend swaps the code plus the secret for who they are.
 * Someone who intercepts the code cannot use it without the secret.
 *
 * `state` is a second random value, checked on the way back, so a code from a
 * sign-in somebody else started (a link planted in an email, say) is refused
 * instead of signing this browser in to their account.
 */

export type Provider = "lichess" | "chesscom";

/** Signing in (from /login or /signup), or linking from Settings. */
export type LinkedMode = "signin" | "connect";

/**
 * Chess.com issues a client ID only to apps it approves. Until this is set on
 * Vercel, Chess.com sign-in is hidden everywhere (the backend's
 * CHESSCOM_CLIENT_ID is the other half of the switch).
 */
const CHESSCOM_CLIENT_ID = process.env.NEXT_PUBLIC_CHESSCOM_CLIENT_ID || "";

const PROVIDERS: Record<Provider, { name: string; authorize: string; clientId: string; scope: string }> = {
  // Lichess needs no registration: the client ID is a name we choose, and must
  // match CLIENT_ID in users/lichess_oauth.py.
  lichess: { name: "Lichess", authorize: "https://lichess.org/oauth", clientId: "chesspreparatory.com", scope: "email:read" },
  chesscom: { name: "Chess.com", authorize: "https://oauth.chess.com/authorize", clientId: CHESSCOM_CLIENT_ID, scope: "openid profile email" },
};

export const providerName = (provider: Provider) => PROVIDERS[provider].name;

export const providerEnabled = (provider: Provider) => Boolean(PROVIDERS[provider].clientId);

/** The providers this build offers, in the order they are shown. */
export const enabledProviders = (): Provider[] => (["lichess", "chesscom"] as Provider[]).filter(providerEnabled);

interface Pending {
  verifier: string;
  state: string;
  mode: LinkedMode;
  redirectUri: string;
}

const storageKey = (provider: Provider) => `cs_${provider}_oauth`;

function base64url(bytes: Uint8Array): string {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const random = (n: number) => base64url(crypto.getRandomValues(new Uint8Array(n)));

/** Sends this tab to the provider's "authorize" page. */
export async function startLinkedSignIn(provider: Provider, mode: LinkedMode): Promise<void> {
  const { authorize, clientId, scope } = PROVIDERS[provider];
  const verifier = random(32);
  const state = random(16);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  // Wherever the site is running. Lichess takes any return address; Chess.com
  // only the ones registered with it (production and localhost:3000).
  const redirectUri = `${window.location.origin}/auth/${provider}`;
  const pending: Pending = { verifier, state, mode, redirectUri };
  sessionStorage.setItem(storageKey(provider), JSON.stringify(pending));

  const query = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge_method: "S256",
    code_challenge: base64url(new Uint8Array(digest)),
    scope,
    state,
  });
  window.location.assign(`${authorize}?${query}`);
}

/**
 * The sign-in this tab started with `provider`, if `state` is the one it sent.
 * Read once: a code is single-use, and so is the secret that goes with it.
 */
export function takePending(provider: Provider, state: string | null): Pending | null {
  let pending: Pending | null = null;
  try {
    const raw = sessionStorage.getItem(storageKey(provider));
    sessionStorage.removeItem(storageKey(provider));
    pending = raw ? (JSON.parse(raw) as Pending) : null;
  } catch {
    return null;
  }
  if (!pending || !state || pending.state !== state) return null;
  return pending;
}
