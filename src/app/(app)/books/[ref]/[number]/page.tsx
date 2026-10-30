"use client";

import { useParams } from "next/navigation";

import { BookExerciseView } from "@/components/books/BookExerciseView";

export default function BookExercisePage() {
  const { ref, number } = useParams<{ ref: string; number: string }>();
  return <BookExerciseView publicId={ref} number={Number(number)} bookHref={`/books/${ref}`} hrefFor={(n) => `/books/${ref}/${n}`} />;
}
