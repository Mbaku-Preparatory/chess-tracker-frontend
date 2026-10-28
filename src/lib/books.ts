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
  "publicId title status error kind exerciseCount verifiedCount progress pageCount pagesDone diagramCount moveCount notifyEmail sha256 createdAt";

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

export async function getBook(publicId: string): Promise<BookDetail | null> {
  const data = await query<{ book: BookDetail | null }>(
    `query($id: String!) { book(publicId: $id) { ${BOOK_FIELDS} renumbered missingSolutions
       exercises { number white black event verified } } }`,
    { id: publicId },
  );
  return data.book;
}

/** One exercise, with what its page needs about the book around it. */
export async function getBookExercise(
  publicId: string,
  number: number,
): Promise<{ exercise: BookExercise | null; title: string; numbers: number[] }> {
  const data = await query<{ bookExercise: BookExercise | null; book: { title: string; exercises: { number: number }[] } | null }>(
    `query($id: String!, $n: Int!) {
       bookExercise(publicId: $id, number: $n) { number white black event date fen pgn verified problem }
       book(publicId: $id) { title exercises { number } } }`,
    { id: publicId, n: number },
  );
  return {
    exercise: data.bookExercise,
    title: data.book?.title ?? "",
    numbers: data.book?.exercises.map((e) => e.number) ?? [],
  };
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
