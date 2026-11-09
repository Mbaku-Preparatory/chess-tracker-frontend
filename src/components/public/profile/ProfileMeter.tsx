"use client";

import { useEffect } from "react";

import { useSignedIn } from "@/hooks/useSignedIn";
import { allowProfileView } from "@/lib/freeLimits";
import { preparePath } from "@/lib/prepare";
import type { FidePlayerToAdd } from "@/lib/addFidePlayer";

/**
 * A visitor without an account can open FREE_PROFILE_VIEWS different players
 * (lib/freeLimits.ts). Past that, this profile sends them to sign up the way
 * "Prepare against" does, so after signing up they land on this player in the
 * app, games and all. Signed-in visitors are never counted.
 *
 * Renders nothing. The page itself is the same cached HTML for everyone.
 */
export function ProfileMeter({ player }: { player: FidePlayerToAdd }) {
  const signedIn = useSignedIn();

  useEffect(() => {
    // null: not looked yet. Wait, rather than count someone who is signed in.
    if (signedIn !== false) return;
    if (!allowProfileView(player.fideId)) window.location.replace(preparePath(player));
  }, [signedIn, player]);

  return null;
}
