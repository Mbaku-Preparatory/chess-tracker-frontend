import type { Metadata } from "next";

import { ReportProblemForm } from "@/components/support/ReportProblemForm";
import { BackLink } from "@/components/ui/BackLink";
import { fetchSupportContact } from "@/lib/support";

// Signed-in only (founder, 2026-11-14), so not for search engines either.
export const metadata: Metadata = {
  title: "Help | Chess Preparatory",
  robots: { index: false, follow: false },
};

/**
 * Help, inside the signed-in app: just the message form, laid out like
 * Bomahut's (founder, 2026-11-14: no FAQs here; /pricing keeps the billing
 * answers). Reachable after access has run out (lib/subscription.ts,
 * isOpenWithoutAccess). The reply time comes from the backend (lib/support.ts).
 */
export default async function HelpPage() {
  const contact = await fetchSupportContact();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <BackLink href="/home" />
        <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-gray-100">Help</h1>
      </div>
      <section className="card p-6">
        <ReportProblemForm replyHours={contact?.replyHours ?? null} />
      </section>
    </div>
  );
}
