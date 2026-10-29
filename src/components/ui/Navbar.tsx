"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { Logo } from "@/components/ui/Logo";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { clearAuth, setProfilePic } from "@/redux/actions/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BurgerButton } from "@/components/ui/BurgerButton";

// The app's sections, in the bar on a desktop and in the burger menu below it.
const LINKS = [
  { href: "/home", label: "My Opponents" },
  // the user's own chess books: exercises, or a reader for scans
  { href: "/books", label: "Books" },
  // you as a player, in the slot the repertoire used to hold. Unconditional:
  // everyone has a profile from the moment they register, which is the whole
  // reason the row is created eagerly.
  { href: "/me", label: "My Profile" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const { token, refreshToken, email, profilePic } = useAppSelector((s) => s.auth);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // The burger menu closes on any navigation, and on Escape.
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // The sign-in pages have nothing to navigate to, but still need the way
  // home and the theme switch: someone arriving from the dark landing page
  // should be able to keep it dark.
  if (pathname === "/login" || pathname === "/signup") {
    return (
      <nav className="no-print mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Chess Preparatory home">
          <Logo size={32} />
          <span className="hidden text-lg font-bold text-gray-900 dark:text-gray-100 sm:inline">Chess Preparatory</span>
        </Link>
        <ThemeToggle className="text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-dark-elevated dark:hover:text-gray-100" />
      </nav>
    );
  }

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
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
        <Link href="/home" className="flex shrink-0 items-center gap-2.5">
          <Logo size={36} />
          <span className="hidden text-lg font-bold text-gray-900 dark:text-gray-100 sm:inline">Chess Preparatory</span>
        </Link>

        {/* `min-w-0` is what stops this row setting a floor under the page.
            When the bar held five links, they plus the toggle and the avatar
            wanted about 560px, and a flex item refuses to shrink past its
            content by default — so on every phone the whole document became
            560px wide and scrolled sideways, carrying the boards off the
            screen with it. The links scroll within the bar instead; the
            toggle and the avatar stay put.
            The scroller holds only the links: the profile dropdown is
            absolutely positioned, and `overflow-x` on its ancestor would clip
            it. */}
        <div className="hidden min-w-0 items-center gap-1 lg:flex">
          <div className="no-scrollbar flex min-w-0 items-center gap-1 overflow-x-auto">
            {LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(href)
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-dark-elevated dark:hover:text-gray-100"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          <ThemeToggle className="ml-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-dark-elevated dark:hover:text-gray-100" />

          {/* Auth state */}
          {token ? (
            <div ref={profileRef} className="relative ml-2 shrink-0 border-l border-gray-200 pl-3 dark:border-dark-border">
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

        {/* Phones and tablets: a burger, and the whole menu behind it. */}
        <BurgerButton
          open={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          controls="app-menu"
          className="text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-dark-elevated lg:hidden"
        />
      </div>

      {menuOpen && (
        <>
          {/* the page behind: a tap there closes the menu. Absolute, not
              fixed: the bar's backdrop blur makes it the containing block
              for fixed children, which would squeeze this into the bar. */}
          <button
            type="button"
            aria-label="Close the menu"
            tabIndex={-1}
            onClick={() => setMenuOpen(false)}
            className="absolute inset-x-0 top-16 z-40 h-[calc(100dvh-4rem)] cursor-default bg-black/30 lg:hidden"
          />
          <div
            id="app-menu"
            className="absolute inset-x-0 top-16 z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-gray-200 bg-white shadow-lg dark:border-dark-border dark:bg-dark-bg lg:hidden"
          >
            <ul className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 sm:px-6">
              {LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={isActive(href) ? "page" : undefined}
                    className={`block rounded-lg px-4 py-3 text-base font-medium ${
                      isActive(href)
                        ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400"
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-dark-elevated"
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mx-auto max-w-7xl border-t border-gray-100 px-4 py-3 dark:border-dark-border sm:px-6">
              <div className="flex items-center justify-between gap-3 px-4 py-1">
                <span className="text-sm text-gray-600 dark:text-gray-300">Theme</span>
                <ThemeToggle className="text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-dark-elevated dark:hover:text-gray-100" />
              </div>
            </div>

            <div className="mx-auto max-w-7xl border-t border-gray-100 px-4 py-3 dark:border-dark-border sm:px-6">
              {token ? (
                <>
                  <div className="flex items-center gap-3 px-4 py-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-sm font-bold text-white">
                      {profilePic ? <img src={profilePic} alt="" className="h-full w-full object-cover" /> : initials}
                    </div>
                    {email && <p className="min-w-0 truncate text-sm font-medium text-gray-700 dark:text-gray-200">{email}</p>}
                  </div>
                  <Link
                    href="/support"
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-dark-elevated"
                  >
                    Support this project
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      void handleLogout();
                    }}
                    className="block w-full rounded-lg px-4 py-3 text-left text-base font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex gap-2 px-4 py-2">
                  <Link href="/login" className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-center text-sm font-medium text-gray-700 dark:border-dark-border dark:text-gray-200">
                    Login
                  </Link>
                  <Link href="/signup" className="btn-primary flex-1 text-center text-sm">
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
