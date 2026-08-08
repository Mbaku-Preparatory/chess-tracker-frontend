"use client";

import Link from "next/link";

import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default function SchedulePage() {
  return (
    <div>
      <PageHeader title="Today" subtitle="Your prep sessions for the day" />

      <EmptyState
        title="No sessions scheduled"
        description="Plan a study session against an opponent, an opening, or your own games — it'll show up here."
        action={
          <Link href="/players" className="btn-primary text-sm">
            Go to Prep
          </Link>
        }
      />

      <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
        Scheduling is coming soon — this page will hold your daily agenda and streak.
      </p>
    </div>
  );
}
