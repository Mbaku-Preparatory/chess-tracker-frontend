"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearAuth } from "@/store/slices/authSlice";
import { toggleTheme } from "@/store/slices/themeSlice";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const { token, email } = useAppSelector((s) => s.auth);
  const { onboardingComplete, initialized } = useAppSelector((s) => s.repertoire);
  const themeMode = useAppSelector((s) => s.theme.mode);

  // Hide navbar on auth pages and setup page
  if (pathname === "/setup" || pathname === "/login" || pathname === "/signup") return null;

  function handleLogout() {
    dispatch(clearAuth());
    router.replace("/login");
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="no-print sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-dark-border dark:bg-dark-bg/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-lg font-bold text-white">
            MP
          </div>
          <span className="hidden text-lg font-bold text-gray-900 dark:text-gray-100 sm:inline">Mbaku Preparatory</span>
        </Link>

        <div className="flex items-center gap-1">
          {/* Main nav link */}
          <Link
            href="/"
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive("/")
                ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-dark-elevated dark:hover:text-gray-100"
            }`}
          >
            My Opponents
          </Link>

          {/* My Repertoire — only shown after onboarding */}
          {initialized && onboardingComplete && (
            <Link
              href="/setup"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-dark-elevated dark:hover:text-gray-100"
              title="Edit your opening repertoire"
            >
              My Repertoire
            </Link>
          )}

          {/* Theme toggle */}
          <button
            onClick={() => dispatch(toggleTheme())}
            className="ml-1 rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-dark-elevated dark:hover:text-gray-100"
            title={themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {themeMode === "dark" ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
          </button>

          {/* Auth state */}
          {token ? (
            <div className="ml-2 flex items-center gap-2 border-l border-gray-200 pl-3 dark:border-dark-border">
              {email && (
                <span className="hidden max-w-[140px] truncate text-xs text-gray-400 dark:text-gray-500 sm:inline">
                  {email}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-dark-elevated dark:hover:text-gray-200"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="ml-2 flex items-center gap-1 border-l border-gray-200 pl-3 dark:border-dark-border">
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-dark-elevated dark:hover:text-gray-100"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="btn-primary text-sm"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
