"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { clearAuth, setProfilePic } from "@/redux/actions/auth";
import { toggleTheme } from "@/redux/actions/theme";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { token, refreshToken, email, profilePic } = useAppSelector((s) => s.auth);
  const themeMode = useAppSelector((s) => s.theme.mode);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (pathname === "/login" || pathname === "/signup" || pathname === "/") return null;

  async function handleLogout() {
    if (refreshToken) {
      // Best-effort: blacklist the refresh token server-side so it can't be
      // replayed. Still log out locally even if this call fails.
      try {
        await api.logout(refreshToken);
      } catch {
        // ignore
      }
    }
    dispatch(clearAuth());
    router.replace("/login");
  }

  function handleProfilePicChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      dispatch(setProfilePic(ev.target?.result as string));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  const initials = email ? email[0].toUpperCase() : "?";

  const isActive = (href: string) => pathname.startsWith(href);

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
            href="/players"
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive("/players")
                ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-dark-elevated dark:hover:text-gray-100"
            }`}
          >
            My Opponents
          </Link>

          {/* GM Library */}
          <Link
            href="/master-games"
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive("/master-games")
                ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-dark-elevated dark:hover:text-gray-100"
            }`}
          >
            GM Library
          </Link>

          {/* My Profile — you as a player, in the slot the repertoire used to
              hold. Unconditional: everyone has a profile from the moment they
              register, which is the whole reason the row is created eagerly. */}
          <Link
            href="/me"
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive("/me")
                ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-dark-elevated dark:hover:text-gray-100"
            }`}
          >
            My Profile
          </Link>

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
            <div ref={profileRef} className="relative ml-2 border-l border-gray-200 pl-3 dark:border-dark-border">
              {/* Profile avatar button */}
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full ring-2 ring-brand-600/20 transition-all hover:ring-brand-600/50 focus:outline-none"
                title="Profile"
              >
                {profilePic ? (
                  <img src={profilePic} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-brand-600 text-sm font-bold text-white">
                    {initials}
                  </div>
                )}
              </button>

              {/* Profile dropdown */}
              {dropdownOpen && (
                <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-dark-border dark:bg-dark-elevated">
                  {/* Avatar + upload */}
                  <div className="flex flex-col items-center px-4 pt-5 pb-4">
                    <div
                      className="group relative h-16 w-16 cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                      title="Change profile picture"
                    >
                      {profilePic ? (
                        <img src={profilePic} alt="Profile" className="h-full w-full rounded-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-brand-600 text-2xl font-bold text-white">
                          {initials}
                        </div>
                      )}
                      {/* Camera overlay on hover */}
                      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-white">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                        </svg>
                      </div>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProfilePicChange}
                    />
                    <p className="mt-1.5 text-xs text-gray-400">Tap to change photo</p>
                    {email && (
                      <p className="mt-1 max-w-full truncate text-sm font-medium text-gray-700 dark:text-gray-200">
                        {email}
                      </p>
                    )}
                  </div>

                  {/* Theme picker */}
                  <div className="border-t border-gray-100 px-4 py-3 dark:border-dark-border">
                  </div>

                  {/* Support — in the dropdown rather than the main nav, on
                      purpose. Asking for money should be something you find,
                      not the thing that greets you. The mobile app puts it in
                      the same place, at the bottom of the account screen. */}
                  <div className="border-t border-gray-100 dark:border-dark-border">
                    <Link
                      href="/support"
                      onClick={() => setDropdownOpen(false)}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-dark-surface"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                      </svg>
                      Support this project
                    </Link>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-gray-100 dark:border-dark-border">
                    <button
                      onClick={() => { setDropdownOpen(false); handleLogout(); }}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                      </svg>
                      Logout
                    </button>
                  </div>
                </div>
              )}
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
