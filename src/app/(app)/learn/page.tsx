"use client";

import { TutorialGrid } from "@/components/tutorials/TutorialGrid";
import { PageHeader } from "@/components/ui/PageHeader";

/**
 * The tutorials inside the app: the same videos as the public /tutorials
 * page (which stays for visitors and search engines), but in the signed-in
 * frame, so the app's menu does not drop people out into the public site.
 */
export default function LearnPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Tutorials"
        subtitle="Six short videos, each under a minute. Start with adding an opponent; the rest build on it."
      />
      <TutorialGrid />
    </div>
  );
}
