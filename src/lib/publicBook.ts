/**
 * Demo books: reader books anyone can read at /book/<slug>, without an
 * account (books/public_schema.py on the backend; `manage.py publish_book`
 * makes one). The PDF and the index come from the backend's public routes
 * rather than the reader's device.
 */

import { graphqlGet } from "./publicGraphql";
import { BACKEND_ORIGIN } from "./site";

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
export const ABOUT: Record<string, { author: string; year: number; blurb: string; edition?: { text: string; href: string } }> = {
  "chess-fundamentals": {
    author: "José Raúl Capablanca",
    year: 1921,
    blurb:
      "The World Champion's own course for improving players: endings first, then the middlegame and the opening, with the principles behind each shown in his games.",
    // The 1921 text is public domain; this algebraic typesetting of it is
    // released CC0 by its maker.
    edition: { text: "Algebraic edition typeset by lordlinks, CC0", href: "https://github.com/lordlinks/Chess_Fundamentals" },
  },
};

const FIELDS = "publicSlug title pageCount diagramCount moveCount sha256 finishedAt";

export const bookPath = (slug: string) => `/book/${slug}`;
export const bookIndexUrl = (slug: string) => `${BACKEND_ORIGIN}/api/books/public/${encodeURIComponent(slug)}/reader/`;
export const bookPdfUrl = (slug: string) => `${BACKEND_ORIGIN}/api/books/public/${encodeURIComponent(slug)}/pdf/`;

const graphql = <T,>(query: string, variables: Record<string, unknown>) => graphqlGet<T>(query, variables, { next: { revalidate: 3600 } });

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
