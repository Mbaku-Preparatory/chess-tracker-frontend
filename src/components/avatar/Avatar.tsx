/** A round face: one of our avatars, or a photo when given one. */
export function Avatar({ src, size = 32, className = "" }: { src: string; size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`shrink-0 rounded-full bg-ink-raised object-cover ${className}`}
    />
  );
}
