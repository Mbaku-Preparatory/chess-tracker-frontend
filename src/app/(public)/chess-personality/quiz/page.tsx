import type { Metadata } from "next";

import { Quiz } from "@/components/public/personality/Quiz";

export const metadata: Metadata = {
  title: "Chess personality test",
  description: "Twenty quick questions: find out what kind of chess player you are.",
  alternates: { canonical: "/chess-personality/quiz" },
  // The questions are the test's front page's job to rank for, not this one's.
  robots: { index: false, follow: true },
};

export default function ChessPersonalityQuizPage() {
  return <Quiz />;
}
