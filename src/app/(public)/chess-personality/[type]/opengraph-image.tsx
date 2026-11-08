import { personalityCard } from "@/components/public/personality/shareCard";
import { BY_SLUG, TYPES } from "@/lib/chessPersonality";

// One picture per type, built with the pages (components/public/personality/shareCard).
export const alt = "Chess personality";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamicParams = false;

export function generateStaticParams() {
  return TYPES.map((t) => ({ type: t.slug }));
}

export default async function Image({ params }: { params: Promise<{ type: string }> }) {
  return personalityCard(BY_SLUG.get((await params).type) ?? null);
}
