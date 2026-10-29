import Link from "next/link";

import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/ui/Logo";

import { AccountLinks } from "./AccountLinks";
import { PublicMenu } from "./PublicMenu";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-ink-line/60 bg-ink-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Chess Preparatory home">
          <Logo size={30} />
          <span className="hidden whitespace-nowrap text-[17px] font-[480] tracking-[0.01em] sm:inline">Chess Preparatory</span>
        </Link>
        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/rankings" className="whitespace-nowrap rounded-pill px-3 py-2 text-[15px] text-ink-muted hover:bg-ink-raised hover:text-ink-text sm:px-4">
            Rankings
          </Link>
          <Link href="/chess-bot" className="whitespace-nowrap rounded-pill px-3 py-2 text-[15px] text-ink-muted hover:bg-ink-raised hover:text-ink-text sm:px-4">
            Chess bot
          </Link>
          <Link href="/chess-books" className="whitespace-nowrap rounded-pill px-3 py-2 text-[15px] text-ink-muted hover:bg-ink-raised hover:text-ink-text sm:px-4">
            Books
          </Link>
          <ThemeToggle className="text-ink-muted hover:bg-ink-raised hover:text-ink-text" />
          <AccountLinks />
        </div>
        {/* Phones and tablets: the main button, and the rest behind a burger. */}
        <div className="flex items-center gap-1 lg:hidden">
          <AccountLinks primaryOnly />
          <PublicMenu />
        </div>
      </div>
    </header>
  );
}
