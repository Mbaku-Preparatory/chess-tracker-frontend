const TOKEN_KEY = "cs_access_token";
const EMAIL_KEY = "cs_email";

export const authStorage = {
  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  getEmail(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(EMAIL_KEY);
  },
  setEmail(email: string) {
    localStorage.setItem(EMAIL_KEY, email);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
  },
};
