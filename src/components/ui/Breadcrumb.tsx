import Link from "next/link";
import { Fragment } from "react";

/**
 * "My Opponents / Add Opponent" above an in-app page. Every crumb links except
 * the last, which is the page you're on. One component so the colours (light
 * and dark) are written once.
 */
export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
      {items.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && <span aria-hidden>/</span>}
          {item.href ? (
            <Link href={item.href} className="hover:text-gray-900 dark:hover:text-gray-100">
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className="text-gray-900 dark:text-gray-100">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
