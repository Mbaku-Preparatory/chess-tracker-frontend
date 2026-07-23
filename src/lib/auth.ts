const TOKEN_KEY = "cs_access_token";
const REFRESH_TOKEN_KEY = "cs_refresh_token";
const EMAIL_KEY = "cs_email";
const PROFILE_PIC_KEY = "cs_profile_pic";

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
  getProfilePic(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(PROFILE_PIC_KEY);
  },
  setProfilePic(pic: string) {
    localStorage.setItem(PROFILE_PIC_KEY, pic);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem(PROFILE_PIC_KEY);
  },
};
