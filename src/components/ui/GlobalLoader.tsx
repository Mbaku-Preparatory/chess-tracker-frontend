"use client";

import { useEffect, useState } from "react";
import { requestTracker } from "@/lib/request-tracker";
import { useT } from "@/hooks/useT";

export function GlobalLoader() {
  const t = useT();
  const [active, setActive] = useState(false);

  useEffect(() => {
    const unsub = requestTracker.subscribe(setActive);
    return () => { unsub(); };
  }, []);

  if (!active) return null;

  return (
    <div
      role="progressbar"
      aria-label={t("Loading")}
      aria-busy="true"
      className="fixed left-0 top-0 z-50 h-[3px] w-full overflow-hidden bg-transparent"
    >
      <div className="animate-global-loader h-full w-full bg-brand-500" />
    </div>
  );
}
