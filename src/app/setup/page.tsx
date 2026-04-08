"use client";

import dynamic from "next/dynamic";

const SetupPageClient = dynamic(() => import("./SetupPageClient"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
    </div>
  ),
});

export default function SetupPage() {
  return <SetupPageClient />;
}
