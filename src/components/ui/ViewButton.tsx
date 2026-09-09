"use client";

/**
 * The "you can open this" affordance on a table row.
 *
 * The game tables have always opened a viewer when a row is clicked, and said
 * so with nothing but a hover tint — which a first-time visitor has no reason
 * to go looking for, and a touch screen never shows at all.
 *
 * It is a real button rather than a styled span, so the row is reachable by
 * keyboard. A `<tr onClick>` is not focusable and not announced as anything
 * you can do, so until now the tables could only be used with a mouse.
 *
 * The row stays clickable. This is the signpost, not the only way in.
 */
export function ViewButton({
  onClick,
  loading = false,
  label = "View game",
}: {
  onClick: (e: React.MouseEvent) => void;
  loading?: boolean;
  /** For screen readers, where "View" on its own says nothing about what. */
  label?: string;
}) {
  return (
    <button
      type="button"
      // The row beneath handles the same click, and letting it through would
      // open the viewer twice.
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      disabled={loading}
      aria-label={label}
      className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-50 dark:border-dark-border dark:text-gray-300 dark:hover:border-brand-700 dark:hover:bg-brand-900/30 dark:hover:text-brand-300"
    >
      {loading ? (
        "…"
      ) : (
        <>
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          View
        </>
      )}
    </button>
  );
}
