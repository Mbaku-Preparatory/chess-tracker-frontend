import Link from "next/link";

/**
 * Log in or sign up, from a public page: in a new tab. The app's own pages
 * have no way back to the page someone came from (no back button of ours, and
 * not everyone thinks of the logo), so the public page stays open where it
 * was. It notices the sign-in on its own (hooks/useSignedIn).
 */
export function AuthLink({
  href,
  className,
  children,
}: {
  href: "/login" | "/signup";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} target="_blank" rel="noopener" className={className}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </Link>
  );
}
