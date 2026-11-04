"use client";

import { LinkedReturn } from "@/components/LinkedReturn";

/** Registered with Chess.com as the redirect URI; see lib/linkedAuth. */
export default function ChessComReturnPage() {
  return <LinkedReturn provider="chesscom" />;
}
