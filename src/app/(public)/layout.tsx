import { Inter } from "next/font/google";

import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";

const inter = Inter({ subsets: ["latin"], variable: "--font-public", display: "swap" });

/**
 * Pages anyone can read, signed in or not: player profiles, and the landing
 * page. Server-rendered, so a crawler gets the content in the HTML, and
 * outside AuthGate, so nobody is sent to /login to read them.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.variable} min-h-screen bg-ink-canvas font-public text-ink-text antialiased`}>
      <PublicHeader />
      <main className="mx-auto max-w-[1200px] px-4 pb-24 pt-8 sm:px-6">{children}</main>
      <PublicFooter />
    </div>
  );
}
