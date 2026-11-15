import { SignupForm } from "@/components/SignupForm";
import { TrialNote } from "@/components/TrialNote";

// Before an account exists is the moment to say a trial will start: nothing
// else said so until the banner inside the app (2026-11-15 review).
export default function SignupPage() {
  return <SignupForm trialNote={<TrialNote className="mt-3 text-xs text-gray-500 dark:text-gray-400" />} />;
}
