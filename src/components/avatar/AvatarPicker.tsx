"use client";

import { useEffect, useRef } from "react";

import { AVATARS, avatarSrc } from "@/lib/avatars";

/** Fills its tile and stays round as the grid narrows on a phone. */
// eslint-disable-next-line @next/next/no-img-element
const Face = ({ src }: { src: string }) => <img src={src} alt="" className="aspect-square w-full max-w-16 rounded-full bg-ink-raised object-cover" />;

/**
 * The 25 avatars as a grid in a dialog. `current` is the one showing now;
 * picking calls onPick with its number, and the first tile (null) goes back
 * to the default: a photo if there is one, else the face picked for you.
 */
export function AvatarPicker({
  title,
  current,
  defaultSrc,
  defaultLabel,
  onPick,
  onClose,
}: {
  title: string;
  current: number | null;
  defaultSrc: string;
  defaultLabel: string;
  onPick: (avatar: number | null) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  // No close() on cleanup: closing fires onClose, and unmounting removes the
  // dialog anyway. (React's dev double-mount closed it the moment it opened.)
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const tile = (active: boolean) =>
    `flex w-full flex-col items-center gap-1 rounded-xl p-1.5 outline-none focus-visible:ring-2 focus-visible:ring-accent ${
      active ? "bg-accent/15 ring-2 ring-accent" : "hover:bg-ink-raised"
    }`;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // A click on the backdrop lands on the dialog itself.
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className="m-auto w-[min(100vw-32px,520px)] rounded-2xl bg-ink-card p-0 text-ink-text backdrop:bg-black/50"
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[17px] font-[520]">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-pill px-3 py-1 text-[14px] text-ink-muted hover:bg-ink-raised hover:text-ink-text">
            Close
          </button>
        </div>
        <ul className="grid grid-cols-5 gap-1.5">
          <li>
            <button type="button" aria-pressed={current === null} onClick={() => onPick(null)} className={tile(current === null)} title={defaultLabel}>
              <Face src={defaultSrc} />
              <span className="text-[11px] text-ink-faint">{defaultLabel}</span>
            </button>
          </li>
          {AVATARS.map((n) => (
            <li key={n}>
              <button type="button" aria-pressed={current === n} aria-label={`Avatar ${n}`} onClick={() => onPick(n)} className={tile(current === n)}>
                <Face src={avatarSrc(n)} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </dialog>
  );
}
