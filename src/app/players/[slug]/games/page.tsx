"use client";

import { useParams } from "next/navigation";

import { PlayerGamesView } from "@/components/players/PlayerGamesView";

export default function GamesPage() {
  const { slug } = useParams<{ slug: string }>();
  return <PlayerGamesView slug={slug} />;
}
