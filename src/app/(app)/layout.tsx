import { ActiveImportsIndicator } from "@/components/import/ActiveImportsIndicator";
import { ActiveImportsProvider } from "@/components/import/ActiveImportsProvider";
import { AuthGate } from "@/components/AuthGate";
import { PreferencesProvider } from "@/components/PreferencesProvider";
import { Navbar } from "@/components/ui/Navbar";

/**
 * The signed-in app. Every page under (app) is behind AuthGate; the route
 * group changes no URLs, it only keeps this shell off the public pages.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      {/*
        Inside AuthGate: the poller needs a signed-in user, and there
        is nothing to report on the login screen.
      */}
      <ActiveImportsProvider>
        <PreferencesProvider>
          <Navbar />
          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </main>
          <ActiveImportsIndicator />
        </PreferencesProvider>
      </ActiveImportsProvider>
    </AuthGate>
  );
}
