"use client";

import { useParams } from "next/navigation";

import { PlayBotView } from "@/components/bot/PlayBotView";

export default function PlayBotPage() {
  const { slug } = useParams<{ slug: string }>();
  return <PlayBotView slug={slug} />;
}
