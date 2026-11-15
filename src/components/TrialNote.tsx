import { T } from "@/components/T";
import { fetchTrialDays, TRIAL_TERMS } from "@/lib/pricing";

/** "14 days free. No card needed. Nothing renews by itself." The length is the
 * backend's (SUBSCRIPTION_TRIAL_DAYS), so changing the trial changes this too. */
export async function TrialNote({ className }: { className?: string }) {
  return (
    <p className={className}>
      <T vars={{ days: await fetchTrialDays() }}>{TRIAL_TERMS}</T>
    </p>
  );
}
