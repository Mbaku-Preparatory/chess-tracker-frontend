/**
 * The app's video tutorials, in one place. A tutorial is used by the Tutorials
 * page (app/(public)/tutorials) and by a "Watch how" link on the screen it
 * explains (components/tutorials/TutorialLink). Adding or replacing one is an
 * edit here plus its three files in public/tutorials/<id>.{mp4,jpg,vtt}.
 *
 * The videos are recorded from the real app on a demo account; the recording
 * and rendering scripts are kept with the marketing material, not here.
 */

export type TutorialId = "add-opponent" | "online-games" | "opening-tree" | "bot" | "mbaku" | "books";

export type Tutorial = {
  id: TutorialId;
  title: string;
  /** One sentence for the Tutorials page and search results. */
  summary: string;
  seconds: number;
};

// The order a new user would meet them in.
export const TUTORIALS: Tutorial[] = [
  { id: "add-opponent", title: "Add an opponent", seconds: 41,
    summary: "Search FIDE by name or FIDE ID, pick the player, and their ratings and tournament games come in." },
  { id: "online-games", title: "Import Chess.com and Lichess games", seconds: 44,
    summary: "Bring in an opponent's recent online games, next to their over-the-board ones." },
  { id: "opening-tree", title: "Explore their opening tree", seconds: 50,
    summary: "Every opening they play with each colour, move by move, with how often and how they score." },
  { id: "bot", title: "Play their bot", seconds: 44,
    summary: "Rehearse against a bot that opens the way your opponent does, from their real games." },
  { id: "mbaku", title: "Ask Mbaku AI", seconds: 41,
    summary: "Ask questions about an opponent and get answers drawn only from their games." },
  { id: "books", title: "Read a chess book on a board", seconds: 38,
    summary: "Upload a PDF chess book; tap any move in it and the position opens on a board." },
];

export const tutorial = (id: TutorialId): Tutorial => TUTORIALS.find((t) => t.id === id)!;

export const tutorialFiles = (id: TutorialId) => ({
  video: `/tutorials/${id}.mp4`,
  poster: `/tutorials/${id}.jpg`,
  captions: `/tutorials/${id}.vtt`,
});

/** "41s", "1:02". */
export function tutorialLength(seconds: number): string {
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
