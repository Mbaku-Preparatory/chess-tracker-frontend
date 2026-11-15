import Link from "next/link";
import { AuthLink } from "@/components/public/AuthLink";
import { NotOnFunPage } from "@/components/public/FunPages";
import { T } from "@/components/T";

export function PublicFooter() {
  return (
    <footer className="border-t border-ink-line/60">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-10 text-[13px] text-ink-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          <T>{"Ratings and ranks from FIDE's official rating list. Games from chess-results.com."}</T>
        </p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/rankings" className="hover:text-ink-muted"><T>Rankings</T></Link>
          <Link href="/rankings/countries" className="hover:text-ink-muted"><T>Rankings by country</T></Link>
          <Link href="/chess-bot" className="hover:text-ink-muted"><T>Create your own bot</T></Link>
          <Link href="/chess-books" className="hover:text-ink-muted"><T>Chess books</T></Link>
          <Link href="/chess-personality" className="hover:text-ink-muted"><T>Chess personality test</T></Link>
          <Link href="/tutorials" className="hover:text-ink-muted"><T>Tutorials</T></Link>
          <Link href="/pricing" className="hover:text-ink-muted"><T>Pricing</T></Link>
          <Link href="/privacy" className="hover:text-ink-muted"><T>Privacy</T></Link>
          <NotOnFunPage>
            <AuthLink href="/login" className="hover:text-ink-muted"><T>Log in</T></AuthLink>
          </NotOnFunPage>
        </nav>
      </div>
    </footer>
  );
}
