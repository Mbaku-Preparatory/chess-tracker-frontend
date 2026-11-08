import { ActiveImportsIndicator } from "@/components/import/ActiveImportsIndicator";
import { ActiveImportsProvider } from "@/components/import/ActiveImportsProvider";
import { AuthGate } from "@/components/AuthGate";
import { ClaimGuestBook } from "@/components/books/ClaimGuestBook";
import { PreferencesProvider } from "@/components/PreferencesProvider";
import { ResumePrepare } from "@/components/ResumePrepare";
import { SubscriptionBanner } from "@/components/subscription/SubscriptionBanner";
import { SubscriptionProvider } from "@/components/subscription/SubscriptionProvider";
import { Navbar } from "@/components/ui/Navbar";

/**
 * The signed-in app. Every page under (app) is behind AuthGate; the route
 * group changes no URLs, it only keeps this shell off the public pages.
 * SubscriptionProvider is the paywall's redirect, and sits outside the
 * import poller so a user whose access has run out is not polled for imports.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      {/*
        Inside AuthGate: the poller needs a signed-in user, and there
        is nothing to report on the login screen.
      */}
      <SubscriptionProvider>
        <ActiveImportsProvider>
          <PreferencesProvider>
            <Navbar />
            <SubscriptionBanner />
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
              {children}
            </main>
            <ActiveImportsIndicator />
            <ClaimGuestBook />
            <ResumePrepare />
          </PreferencesProvider>
        </ActiveImportsProvider>
      </SubscriptionProvider>
    </AuthGate>
  );
}
