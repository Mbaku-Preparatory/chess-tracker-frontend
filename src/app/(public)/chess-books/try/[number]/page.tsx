import type { Metadata } from "next";

import { GuestBookExercise } from "@/components/public/books/GuestBookExercise";

export const metadata: Metadata = { title: "Your book's exercise | Chess Preparatory", robots: { index: false } };

type Params = Promise<{ number: string }>;

export default async function TryABookExercisePage({ params }: { params: Params }) {
  const { number } = await params;
  return <GuestBookExercise number={Number(number)} />;
}
