"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { useActiveImports } from "@/components/import/ActiveImportsProvider";
import { addFidePlayer } from "@/lib/addFidePlayer";
import { userMessage } from "@/lib/apiError";
import { prepareTarget, savePendingPrepare } from "@/lib/prepare";
import { useAppSelector } from "@/redux/hooks";

/**
 * Where a public profile's "Prepare" button lands (lib/prepare.ts). Signed in:
 * add the player and open them. Signed out: remember the player and go to sign
 * up. AuthGate lets this path through signed out for that reason.
 */
function Prepare() {
  const router = useRouter();
  const { fideId } = useParams<{ fideId: string }>();
  const search = useSearchParams();
  const { token, initialized } = useAppSelector((s) => s.auth);
  const { refresh: refreshActiveImports } = useActiveImports();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const target = prepareTarget(fideId, search);

  useEffect(() => {
    if (!initialized || started.current) return;
    started.current = true;
    if (!target) {
      router.replace("/home");
      return;
    }
    if (!token) {
      savePendingPrepare(target);
      router.replace("/signup");
      return;
    }
    addFidePlayer(target, refreshActiveImports)
      .then(({ href }) => router.replace(href))
      .catch((err) => setError(userMessage(err, "Could not add this player.")));
    // Once, as soon as we know whether they are signed in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, token]);

  if (error) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        <p className="mt-4 text-sm">
          <Link href="/home" className="font-medium text-brand-600 hover:text-brand-700">
            Find them from your players instead
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-16 text-center text-sm text-gray-500 dark:text-gray-400" role="status">
      {target && token ? `Adding ${target.fullName} to your players…` : "One moment…"}
    </div>
  );
}

export default function PreparePage() {
  return (
    <Suspense>
      <Prepare />
    </Suspense>
  );
}
