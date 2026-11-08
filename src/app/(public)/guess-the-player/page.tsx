import type { Metadata } from "next";

import { GuessThePlayer } from "@/components/public/guess/GuessThePlayer";

const TITLE = "Guess the player: a daily chess puzzle";
const DESCRIPTION = "A mystery FIDE player every day. Eight guesses, with clues for federation, title, rating and age.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/guess-the-player" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/guess-the-player", type: "website", siteName: "Chess Preparatory" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

/** Just for fun, like the chess personality test: the whole game runs in the browser and points nowhere else. */
export default function GuessThePlayerPage() {
  return <GuessThePlayer />;
}
