const TOKEN_KEY = "cs_access_token";
const REFRESH_TOKEN_KEY = "cs_refresh_token";
const EMAIL_KEY = "cs_email";
// The old browser-only profile photo. No longer written; dropped when the
// session loads, so its data URL (often megabytes) doesn't sit in storage.
const PROFILE_PIC_KEY = "cs_profile_pic";

/**
 * Marks <html data-signed-in> before the first paint when this browser has a
 * session. React runs too late for that, and the server cannot see
 * localStorage; CSS uses the mark to hide the space reserved for an ad
 * (components/public/AdSlot.tsx), so a signed-in user never sees it appear and
 * vanish. The same pattern as THEME_SCRIPT (lib/theme.ts).
 */
export const SIGNED_IN_SCRIPT = `(function(){try{if(localStorage.getItem(${JSON.stringify(TOKEN_KEY)}))document.documentElement.setAttribute("data-signed-in","");}catch(e){}})();`;

export const authStorage = {
  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  setRefreshToken(token: string) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },
  getEmail(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(EMAIL_KEY);
  },
  setEmail(email: string) {
    localStorage.setItem(EMAIL_KEY, email);
  },
  dropOldPhoto() {
    try {
      localStorage.removeItem(PROFILE_PIC_KEY);
    } catch {
      // Blocked storage: nothing to clear.
    }
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem(PROFILE_PIC_KEY);
  },
};
