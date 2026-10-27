/**
 * A user's chess books: the GraphQL side (books/schema.py on the backend).
 * Uploading and the PGN download are REST, in lib/api.ts, because they carry
 * file bodies.
 */

import graphqlClient from "@/api/graphqlClient";

export type BookStatus = "pending" | "running" | "succeeded" | "failed";

export type Book = {
  publicId: string;
  title: string;
  status: BookStatus;
  error: string;
  exerciseCount: number;
  verifiedCount: number;
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

const BOOK_FIELDS = "publicId title status error exerciseCount verifiedCount createdAt";

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
