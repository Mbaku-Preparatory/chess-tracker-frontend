"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Go to a player's profile by FIDE ID.
 *
 * The URL's name part is a placeholder: the profile page answers a wrong name
 * with a redirect to the right one, so the ID is all this needs to know.
 */
export function FideIdLookup() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const id = value.replace(/\s/g, "");
    if (!/^\d{3,10}$/.test(id)) {
      setError("A FIDE ID is a number, like 1503014. Find yours on ratings.fide.com.");
      return;
    }
    setError(null);
    router.push(`/player/player/${id}`);
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-[520px] flex-col gap-2" role="search">
      <label htmlFor="fide-id" className="sr-only">FIDE ID</label>
      <div className="flex">
        <input
          id="fide-id"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Enter a FIDE ID"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "fide-id-error" : undefined}
          className="min-w-0 flex-1 rounded-l-pill border border-r-0 border-ink-muted/60 bg-transparent px-5 py-3.5 text-[16px] text-ink-text placeholder:text-ink-faint focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          className="whitespace-nowrap rounded-r-pill bg-accent px-6 py-3.5 text-[16px] font-[480] text-accent-on hover:bg-accent-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          View profile
        </button>
      </div>
      {error && (
        <p id="fide-id-error" className="text-[14px] text-result-loss">
          {error}
        </p>
      )}
    </form>
  );
}
