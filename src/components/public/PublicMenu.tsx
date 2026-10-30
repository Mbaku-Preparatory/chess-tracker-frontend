"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthLink } from "@/components/public/AuthLink";
import { BurgerButton } from "@/components/ui/BurgerButton";
import { useSignedIn } from "@/hooks/useSignedIn";

/**
 * The public header's menu on phones and tablets (below lg): everything the
 * bar shows on a desktop, behind a burger. Rendered inside the sticky header,
 * which it hangs under.
 */
export function PublicMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const signedIn = useSignedIn() === true;
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const item = "block rounded-xl px-4 py-3 text-[16px] text-ink-text hover:bg-ink-raised";
  // Get started / Open app stay in the bar beside the burger, so not here too.
  const links = [
    { href: "/rankings", label: "Rankings" },
    { href: "/chess-bot", label: "Chess bot" },
    { href: "/chess-books", label: "Books" },
  ];

  return (
    <>
      <BurgerButton open={open} onClick={() => setOpen((o) => !o)} controls="public-menu" className="text-ink-text hover:bg-ink-raised" />
      {open && (
        <>
          {/* Absolute, not fixed: the header's backdrop blur makes it the
              containing block for fixed children. */}
          <button
            type="button"
            aria-label="Close the menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="absolute inset-x-0 top-16 z-40 h-[calc(100dvh-4rem)] cursor-default bg-black/30"
          />
          <div id="public-menu" className="absolute inset-x-0 top-16 z-50 border-b border-ink-line/60 bg-ink-canvas shadow-lg">
            <ul className="mx-auto flex max-w-[1200px] flex-col gap-1 px-4 py-3 sm:px-6">
              {links.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    aria-current={pathname.startsWith(href) ? "page" : undefined}
                    className={`${item} ${pathname.startsWith(href) ? "bg-accent/10 text-accent" : ""}`}
                  >
                    {label}
                  </Link>
                </li>
              ))}
              {!signedIn && (
                <li>
                  <AuthLink href="/login" className={item}>
                    Log in
                  </AuthLink>
                </li>
              )}
            </ul>
            <div className="mx-auto flex max-w-[1200px] items-center justify-between border-t border-ink-line/60 px-8 py-3 sm:px-10">
              <span className="text-[15px] text-ink-muted">Theme</span>
              <ThemeToggle className="text-ink-muted hover:bg-ink-raised hover:text-ink-text" />
            </div>
          </div>
        </>
      )}
    </>
  );
}
