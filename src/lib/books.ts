/**
 * A user's chess books: the GraphQL side (books/schema.py on the backend).
 * Uploading, the PGN download and a reader book's index are REST, in
 * lib/api.ts, because they carry file bodies.
 *
 * Two kinds: "exercises" (a book typeset in a chess font, read into one
 * position per exercise) and "reader" (any other book, usually a scan: the
 * owner reads their own PDF and every move in it opens on the board).
 */

import graphqlClient from "@/api/graphqlClient";
import { graphqlPost } from "@/lib/publicGraphql";

export type BookStatus = "pending" | "running" | "succeeded" | "failed";
export type BookKind = "exercises" | "reader";

export type Book = {
  publicId: string;
  title: string;
  status: BookStatus;
  error: string;
  kind: BookKind;
  exerciseCount: number;
  verifiedCount: number;
  /** 0..1 while a reader book is read page by page; null when unknown. */
  progress: number | null;
  pageCount: number;
  pagesDone: number;
  diagramCount: number;
  moveCount: number;
  notifyEmail: boolean;
  sha256: string;
  createdAt: string;
  /** Pages in the whole PDF; pageCount can be fewer (see readInPart). */
  pdfPageCount: number;
  /** Only the first pageCount pages were read: a book from the guest trial. */
  readInPart: boolean;
};

export type BookExerciseSummary = { number: number; white: string; black: string; event: string; verified: boolean };

export type BookDetail = Book & {
  renumbered: [number, number][];
  missingSolutions: number[];
  exercises: BookExerciseSummary[];
};

export type BookExercise = {
  number: number;
  white: string;
  black: string;
  event: string;
  date: string;
  fen: string;
  pgn: string;
  verified: boolean;
  problem: string;
};

const BOOK_FIELDS =
  "publicId title status error kind exerciseCount verifiedCount progress pageCount pagesDone diagramCount moveCount notifyEmail sha256 createdAt pdfPageCount readInPart";

async function query<T>(text: string, variables: Record<string, unknown> = {}): Promise<T> {
  const response = await graphqlClient({ data: { query: text, variables } });
  const errors = response.data?.errors;
  if (errors?.length) throw new Error(errors[0].message);
  return response.data.data;
}

export const isConverting = (b: Pick<Book, "status">) => b.status === "pending" || b.status === "running";

export async function myBooks(): Promise<Book[]> {
  return (await query<{ myBooks: Book[] }>(`{ myBooks { ${BOOK_FIELDS} } }`)).myBooks;
}

const DETAIL_FIELDS = `${BOOK_FIELDS} renumbered missingSolutions exercises { number white black event verified }`;

/**
 * One book with its exercises: the account's own, or, with `guestKey`, the
 * book tried without an account (lib/guestBook.ts), asked for with no login.
 */
export async function getBook(publicId: string, guestKey?: string): Promise<BookDetail | null> {
  if (guestKey) {
    const data = await graphqlPost<{ guestBook: BookDetail | null }>(
      `query($id: String!, $key: String!) { guestBook(publicId: $id, key: $key) { ${DETAIL_FIELDS} } }`,
      { id: publicId, key: guestKey },
    );
    return data.guestBook;
  }
  const data = await query<{ book: BookDetail | null }>(`query($id: String!) { book(publicId: $id) { ${DETAIL_FIELDS} } }`, { id: publicId });
  return data.book;
}

/** One exercise, with what its page needs about the book around it. */
export type ExerciseWithBook = { exercise: BookExercise | null; title: string; numbers: number[] };

const EXERCISE_FIELDS = "number white black event date fen pgn verified problem";

/** One exercise, with what its page needs about the book around it. `guestKey` as in getBook. */
export async function getBookExercise(publicId: string, number: number, guestKey?: string): Promise<ExerciseWithBook> {
  type Answer = { exercise: BookExercise | null; book: { title: string; exercises: { number: number }[] } | null };
  const data = guestKey
    ? await graphqlPost<Answer>(
        `query($id: String!, $key: String!, $n: Int!) {
           exercise: guestBookExercise(publicId: $id, key: $key, number: $n) { ${EXERCISE_FIELDS} }
           book: guestBook(publicId: $id, key: $key) { title exercises { number } } }`,
        { id: publicId, key: guestKey, n: number },
      )
    : await query<Answer>(
        `query($id: String!, $n: Int!) {
           exercise: bookExercise(publicId: $id, number: $n) { ${EXERCISE_FIELDS} }
           book(publicId: $id) { title exercises { number } } }`,
        { id: publicId, n: number },
      );
  return {
    exercise: data.exercise,
    title: data.book?.title ?? "",
    numbers: data.book?.exercises.map((e) => e.number) ?? [],
  };
}

/** After signing up: the book tried as a guest becomes this account's. Null
 * when the key no longer opens anything (claimed already, or expired). */
export async function claimGuestBook(publicId: string, key: string): Promise<Book | null> {
  const data = await query<{ claimGuestBook: { book: Book | null } }>(
    `mutation($id: String!, $key: String!) { claimGuestBook(publicId: $id, key: $key) { book { ${BOOK_FIELDS} } } }`,
    { id: publicId, key },
  );
  return data.claimGuestBook.book;
}

export async function deleteBook(publicId: string): Promise<boolean> {
  const data = await query<{ deleteBook: { ok: boolean } }>(
    "mutation($id: String!) { deleteBook(publicId: $id) { ok } }",
    { id: publicId },
  );
  return data.deleteBook.ok;
}

/**
 * A reader book's index (books/services/scan/link.py on the backend).
 * Positions are in PDF points from the top-left of each page.
 */
export type ReaderIndex = {
  version: 1;
  /** [fen, san, parent, next]: node 0 is the starting position; a diagram has no parent. */
  nodes: [string, string | null, number | null, number | null][];
  pages: { w: number; h: number; hot: [number, number, number, number, number, HotKind][] }[];
};

/** 0 a diagram, 1 a move of the game, 2 a variation in the text. */
export type HotKind = 0 | 1 | 2;

/** The demo books anyone can read (lib/publicBook.ts has the server side);
 * here for the signed-in app, which fetches in the browser. Empty when the
 * API is down: an invitation, not a page, is what is lost. */
export async function demoBooks(): Promise<{ publicSlug: string; title: string; pageCount: number; moveCount: number }[]> {
  try {
    return (await query<{ publicBooks: { publicSlug: string; title: string; pageCount: number; moveCount: number }[] }>(
      "{ publicBooks { publicSlug title pageCount moveCount } }",
    )).publicBooks;
  } catch {
    return [];
  }
}
