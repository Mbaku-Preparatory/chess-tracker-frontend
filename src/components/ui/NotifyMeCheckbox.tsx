"use client";

/**
 * Offered next to the button, because the decision belongs with the click
 * that starts the import — not somewhere in account settings.
 */
export function NotifyMeCheckbox({
  checked,
  onChange,
  hint = "Useful for big imports — we'll send a link straight to the player.",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2.5 transition hover:border-gray-300 dark:border-dark-border dark:bg-dark-surface dark:hover:border-gray-600">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-[#1a3a6b]"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
          Email me when this is done
        </span>
        <span className="block text-xs text-gray-500 dark:text-gray-400">
          {hint}
        </span>
      </span>
    </label>
  );
}
