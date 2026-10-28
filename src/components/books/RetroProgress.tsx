/**
 * A Windows XP progress bar, on purpose: green blocks filling a bevelled
 * trough while a book is read page by page. Before the page count is known
 * the blocks run across instead (XP's "marquee"), and stand still for people
 * who asked for less motion.
 */

const BLOCK = 8;
const GAP = 2;

// XP's green, top to bottom: a light rim, a strong middle, a light rim
const GREEN =
  "linear-gradient(to bottom, #acedad 0%, #7be47d 14%, #4cda50 28%, #2ed330 42%, #42d845 57%, #76e275 71%, #8fe791 85%, #e9fbe9 100%)";
// one block and its gap, repeated
const SEGMENTS = `repeating-linear-gradient(to right, transparent 0 ${BLOCK}px, var(--retro-trough) ${BLOCK}px ${BLOCK + GAP}px)`;

export function RetroProgress({ value, label }: { value: number | null; label: string }) {
  const percent = value === null ? null : Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div className="flex flex-col gap-1.5">
      <style>{`
        .retro-trough {
          --retro-trough: #ffffff;
          border: 1px solid #686868;
          border-radius: 3px;
          padding: 2px;
          background: var(--retro-trough);
          box-shadow: inset 1px 1px 2px rgba(0, 0, 0, 0.25);
        }
        :root.dark .retro-trough { --retro-trough: #1b1f18; border-color: #5a5f55; }
        @keyframes retro-marquee {
          from { transform: translateX(-${3 * (BLOCK + GAP)}px); }
          to { transform: translateX(var(--retro-width, 320px)); }
        }
        .retro-marquee { animation: retro-marquee 1.6s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .retro-marquee { animation: none; transform: translateX(${2 * (BLOCK + GAP)}px); }
        }
      `}</style>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent ?? undefined}
        className="retro-trough relative h-[18px] w-full max-w-[360px] overflow-hidden"
        style={{ ["--retro-width" as string]: "360px" }}
      >
        {percent === null ? (
          <div
            className="retro-marquee absolute inset-y-[2px] left-0"
            style={{ width: 3 * (BLOCK + GAP), background: `${SEGMENTS}, ${GREEN}` }}
          />
        ) : (
          <div
            className="h-full transition-[width] duration-700 ease-linear"
            style={{ width: `${percent}%`, background: `${SEGMENTS}, ${GREEN}` }}
          />
        )}
      </div>
      <p className="text-[13px] tabular-nums text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}
