"use client";

import { useParams } from "next/navigation";

import { PlayerPrepView } from "@/components/players/PlayerPrepView";

export default function PrepPage() {
  const { slug } = useParams<{ slug: string }>();
  return <PlayerPrepView slug={slug} />;
}
