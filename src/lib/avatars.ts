/**
 * The avatars we ship: public/avatars/01.svg … 25.svg, Open Peeps faces
 * (CC0) drawn with DiceBear. The backend stores a choice as its number
 * (users/validators.py AVATAR_COUNT); null means "pick one for me".
 */
export const AVATAR_COUNT = 25;

export const AVATARS = Array.from({ length: AVATAR_COUNT }, (_, i) => i + 1);

export const avatarSrc = (n: number) => `/avatars/${String(n).padStart(2, "0")}.svg`;

/** The avatar for someone who has not picked one: random-looking, but the
 * same every time for the same seed (a public_id), so a bot keeps its face. */
export function defaultAvatar(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return (Math.abs(h) % AVATAR_COUNT) + 1;
}

export const resolveAvatar = (chosen: number | null | undefined, seed: string) =>
  chosen && chosen >= 1 && chosen <= AVATAR_COUNT ? chosen : defaultAvatar(seed);
