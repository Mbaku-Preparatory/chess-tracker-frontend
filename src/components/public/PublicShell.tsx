import { Inter } from "next/font/google";

import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";

const inter = Inter({ subsets: ["latin"], variable: "--font-public", display: "swap" });

/**
 * The public site's frame: header, page, footer. The (public) layout wraps
 * every public page in it, and the site-wide 404 (app/not-found.tsx) uses it
 * too, so a wrong address still has the logo, the menu and the way home.
 */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.variable} min-h-screen bg-ink-canvas font-public text-ink-text antialiased`}>
      <PublicHeader />
      <main className="mx-auto max-w-[1200px] px-4 pb-24 pt-8 sm:px-6">{children}</main>
      <PublicFooter />
    </div>
  );
}
