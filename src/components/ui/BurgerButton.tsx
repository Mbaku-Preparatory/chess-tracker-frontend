"use client";

/** The ☰ button for phones and tablets: three lines that fold into an X. */
export function BurgerButton({
  open,
  onClick,
  controls,
  className = "",
}: {
  open: boolean;
  onClick: () => void;
  /** the id of the menu it opens */
  controls: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls={controls}
      aria-label={open ? "Close the menu" : "Open the menu"}
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${className}`}
    >
      {[-6, 0, 6].map((y, i) => (
        <span
          key={y}
          aria-hidden="true"
          className="absolute h-0.5 w-5 rounded-full bg-current transition-all duration-200 motion-reduce:transition-none"
          style={{
            transform: open ? (i === 1 ? "scaleX(0)" : `rotate(${i === 0 ? 45 : -45}deg)`) : `translateY(${y}px)`,
            opacity: open && i === 1 ? 0 : 1,
          }}
        />
      ))}
    </button>
  );
}
