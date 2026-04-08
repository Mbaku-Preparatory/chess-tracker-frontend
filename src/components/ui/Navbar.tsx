"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAppSelector } from "@/store/hooks";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/players", label: "Marketplace" },
  { href: "/import", label: "Import Games" },
];

export function Navbar() {
  const pathname = usePathname();
  const { onboardingComplete, initialized } = useAppSelector((s) => s.repertoire);

  // Hide navbar on the setup page
  if (pathname === "/setup") return null;

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
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {initialized && onboardingComplete && (
            <Link
              href="/setup"
              className="ml-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
              title="Edit your opening repertoire"
            >
              My Repertoire
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
