import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="border-t border-ink-line/60">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-10 text-[13px] text-ink-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          Ratings and ranks from FIDE&apos;s official rating list. Games from chess-results.com.
        </p>
        <nav className="flex gap-5">
          <Link href="/privacy" className="hover:text-ink-muted">Privacy</Link>
          <Link href="/login" className="hover:text-ink-muted">Log in</Link>
        </nav>
      </div>
    </footer>
  );
}
