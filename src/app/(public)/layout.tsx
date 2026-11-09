import { PublicShell } from "@/components/public/PublicShell";

/**
 * Pages anyone can read, signed in or not: player profiles, and the landing
 * page. Server-rendered, so a crawler gets the content in the HTML, and
 * outside AuthGate, so nobody is sent to /login to read them.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
