/**
 * The "Getting started" checklist's data (backend users/onboarding.py): six
 * first steps, each worked out from the account's own data, except opening a
 * tree and playing a bot, which the screens that do them record here.
 */

import { gql } from "@/api/gql";
import type { TutorialId } from "@/lib/tutorials";

export type StepKey = "add_opponent" | "import_online" | "open_tree" | "play_bot" | "ask_mbaku" | "read_book";
export type Onboarding = {
  steps: { key: StepKey; done: boolean }[];
  doneCount: number;
  complete: boolean;
  dismissed: boolean;
  show: boolean;
  opponent: { publicId: string; fullName: string } | null;
};

const FIELDS = "steps { key done } doneCount complete dismissed show opponent { publicId fullName }";

export async function fetchOnboarding(): Promise<Onboarding> {
  return (await gql<{ onboarding: Onboarding }>(`{ onboarding { ${FIELDS} } }`)).onboarding;
}

export async function dismissOnboarding(): Promise<Onboarding> {
  return (await gql<{ dismissOnboarding: { onboarding: Onboarding } }>(`mutation { dismissOnboarding { onboarding { ${FIELDS} } } }`)).dismissOnboarding.onboarding;
}

// Once per browser per step is plenty: the first time is what counts.
const MARKED = "onboarding:marked:";

/** Record a step only the screen can see happen. Never throws: a missed
 * record only leaves a box unticked. */
export function markOnboardingStep(step: "open_tree" | "play_bot"): void {
  try {
    if (localStorage.getItem(MARKED + step)) return;
  } catch {
    // no storage: still send it
  }
  gql(`mutation M($s: String!) { markOnboardingStep(step: $s) { onboarding { doneCount } } }`, { s: step })
    .then(() => {
      try { localStorage.setItem(MARKED + step, "1"); } catch { /* fine */ }
    })
    .catch(() => {});
}

/** What each step says and where it goes. `needsOpponent`: it happens on an
 * opponent's page, so without one it points to adding one. */
export const STEP_INFO: Record<StepKey, { label: string; tutorial: TutorialId; href: (op: string | null) => string; needsOpponent: boolean }> = {
  add_opponent: { label: "Add your next opponent", tutorial: "add-opponent", href: () => "/players/new", needsOpponent: false },
  import_online: { label: "Import their Chess.com or Lichess games", tutorial: "online-games", href: (op) => `/players/${op}/import?source=chesscom`, needsOpponent: true },
  open_tree: { label: "Explore their opening tree", tutorial: "opening-tree", href: (op) => `/players/${op}/prep`, needsOpponent: true },
  play_bot: { label: "Play their bot", tutorial: "bot", href: (op) => `/players/${op}/bot`, needsOpponent: true },
  ask_mbaku: { label: "Ask Mbaku about them", tutorial: "mbaku", href: (op) => `/players/${op}/prep?tab=ask`, needsOpponent: true },
  read_book: { label: "Read a chess book on a board", tutorial: "books", href: () => "/books", needsOpponent: false },
};
