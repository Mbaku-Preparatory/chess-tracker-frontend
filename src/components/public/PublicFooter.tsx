import Link from "next/link";
import { AuthLink } from "@/components/public/AuthLink";

export function PublicFooter() {
  return (
    <footer className="border-t border-ink-line/60">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-10 text-[13px] text-ink-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          Ratings and ranks from FIDE&apos;s official rating list. Games from chess-results.com.
        </p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/rankings" className="hover:text-ink-muted">Rankings</Link>
          <Link href="/rankings/countries" className="hover:text-ink-muted">Rankings by country</Link>
          <Link href="/chess-bot" className="hover:text-ink-muted">Create your own bot</Link>
          <Link href="/chess-books" className="hover:text-ink-muted">Chess books</Link>
          <Link href="/privacy" className="hover:text-ink-muted">Privacy</Link>
          <AuthLink href="/login" className="hover:text-ink-muted">Log in</AuthLink>
        </nav>
      </div>
    </footer>
  );
}
