/**
 * The visitor's country, as /pricing passes it around. Its own module, with no
 * imports, because middleware.ts runs on the edge and needs only this.
 */

/** The path segment for a country Vercel could not place. */
export const UNKNOWN_COUNTRY = "unknown";

/** An ISO alpha-2 code, or "" for anything else (unknown, or a hand-typed path). */
export function cleanCountry(value: string | null | undefined): string {
  const code = (value ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : "";
}
