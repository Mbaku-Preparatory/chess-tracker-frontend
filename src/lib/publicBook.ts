/**
 * Demo books: reader books anyone can read at /book/<slug>, without an
 * account (books/public_schema.py on the backend; `manage.py publish_book`
 * makes one). The PDF and the index come from the backend's public routes
 * rather than the reader's device.
 */

import { BackendUnavailable } from "./publicPlayer";
import { BACKEND_ORIGIN, GRAPHQL_URL } from "./site";

export type PublicBook = {
  publicSlug: string;
  title: string;
  pageCount: number;
  diagramCount: number;
  moveCount: number;
  sha256: string;
  finishedAt: string | null;
};

/** What the backend does not know about a demo book: who wrote it and when,
 * for the page's text and its schema.org Book. Keyed by slug; a book
 * published without an entry here still has a page, with the title alone. */
export const ABOUT: Record<string, { author: string; year: number; blurb: string }> = {
  "chess-fundamentals": {
    author: "José Raúl Capablanca",
    year: 1921,
    blurb:
      "The World Champion's own course for improving players: endings first, then the middlegame and the opening, with the principles behind each shown in his games.",
  },
};

const FIELDS = "publicSlug title pageCount diagramCount moveCount sha256 finishedAt";

export const bookPath = (slug: string) => `/book/${slug}`;
export const bookIndexUrl = (slug: string) => `${BACKEND_ORIGIN}/api/books/public/${encodeURIComponent(slug)}/reader/`;
export const bookPdfUrl = (slug: string) => `${BACKEND_ORIGIN}/api/books/public/${encodeURIComponent(slug)}/pdf/`;

async function graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const params = new URLSearchParams({ query, variables: JSON.stringify(variables) });
  let response: Response;
  try {
    response = await fetch(`${GRAPHQL_URL}?${params}`, { headers: { Accept: "application/json" }, next: { revalidate: 3600 } });
  } catch (err) {
    throw new BackendUnavailable(String(err));
  }
  if (!response.ok) throw new BackendUnavailable(`GraphQL answered ${response.status}`);
  const body = await response.json();
  if (body.errors?.length) throw new BackendUnavailable(body.errors[0].message);
  return body.data;
}

/** The book, or null when there is no such demo. Throws BackendUnavailable
 * when the API cannot answer, so the page says so rather than 404. */
export async function fetchPublicBook(slug: string): Promise<PublicBook | null> {
  return (await graphql<{ publicBook: PublicBook | null }>(`query($slug: String!) { publicBook(slug: $slug) { ${FIELDS} } }`, { slug })).publicBook;
}

/** Every demo book, by title. Empty when the API is down: a list, not a page, is what is lost. */
export async function fetchPublicBooks(): Promise<PublicBook[]> {
  try {
    return (await graphql<{ publicBooks: PublicBook[] }>(`{ publicBooks { ${FIELDS} } }`, {})).publicBooks;
  } catch {
    return [];
  }
}
