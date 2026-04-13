"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearAuth } from "@/store/slices/authSlice";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const { token, email } = useAppSelector((s) => s.auth);
  const { onboardingComplete, initialized } = useAppSelector((s) => s.repertoire);

  // Hide navbar on auth pages and setup page
  if (pathname === "/setup" || pathname === "/login" || pathname === "/signup") return null;

  function handleLogout() {
    dispatch(clearAuth());
    router.replace("/login");
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="no-print sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-lg font-bold text-white">
            MP
          </div>
          <span className="hidden text-lg font-bold text-gray-900 sm:inline">Mbaku Preparatory</span>
        </Link>

        <div className="flex items-center gap-1">
          {/* Main nav link */}
          <Link
            href="/"
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive("/")
                ? "bg-brand-50 text-brand-700"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            My Opponents
          </Link>

          {/* My Repertoire — only shown after onboarding */}
          {initialized && onboardingComplete && (
            <Link
              href="/setup"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
              title="Edit your opening repertoire"
            >
              My Repertoire
            </Link>
          )}

          {/* Auth state */}
          {token ? (
            <div className="ml-2 flex items-center gap-2 border-l border-gray-200 pl-3">
              {email && (
                <span className="hidden max-w-[140px] truncate text-xs text-gray-400 sm:inline">
                  {email}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="ml-2 flex items-center gap-1 border-l border-gray-200 pl-3">
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
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
