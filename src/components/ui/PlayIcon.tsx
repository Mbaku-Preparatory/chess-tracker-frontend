/** The play triangle on every video button (tutorials, the homepage video). */
export function PlayIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden className={className}>
      <path d="M4 2.5v11l9-5.5z" />
    </svg>
  );
}
