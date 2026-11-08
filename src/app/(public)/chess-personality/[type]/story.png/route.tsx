import { personalityStory } from "@/components/public/personality/shareCard";
import { BY_SLUG, TYPES } from "@/lib/chessPersonality";

// One story picture per type, built with the pages: never rendered per visit.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return TYPES.map((t) => ({ type: t.slug }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ type: string }> }) {
  const type = BY_SLUG.get((await params).type);
  if (!type) return new Response("Not found", { status: 404 });
  return personalityStory(type);
}
