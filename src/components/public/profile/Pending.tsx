/**
 * A section whose data has never been fetched yet: the shape of what is
 * coming, and what it is waiting on. "No rating history" would read as a fact
 * about the player when it is only a fact about our copy.
 */
export function PendingChart({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <div className="h-7 w-48 animate-pulse rounded-pill bg-ink-raised motion-reduce:animate-none" />
      <div className="relative h-[200px] overflow-hidden rounded-lg bg-ink-raised/40 sm:h-[240px]">
        <div className="absolute inset-0 animate-pulse bg-gradient-to-t from-ink-raised/70 to-transparent motion-reduce:animate-none" />
        <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-[14px] text-ink-faint">{label}</p>
      </div>
    </div>
  );
}

export function PendingRows({ label, rows = 5 }: { label: string; rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <p className="text-[14px] text-ink-faint">{label}</p>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="h-10 animate-pulse rounded-lg bg-ink-raised/60 motion-reduce:animate-none"
          style={{ opacity: 1 - i * 0.15 }}
        />
      ))}
    </div>
  );
}
