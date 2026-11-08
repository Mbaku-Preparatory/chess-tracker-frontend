import { personalityCard } from "@/components/public/personality/shareCard";

export const alt = "Chess personality test";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return personalityCard(null);
}
