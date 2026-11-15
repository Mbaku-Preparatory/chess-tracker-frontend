import Link from "next/link";

import { T } from "@/components/T";

export default function PlayerNotFound() {
  return (
    <div className="flex flex-col items-start gap-4 py-24">
      <h1 className="text-[28px] font-[480]"><T>No rated player with that FIDE ID</T></h1>
      <p className="max-w-[60ch] text-ink-muted">
        <T>Profiles exist for every player rated by FIDE. Check the ID on ratings.fide.com.</T>
      </p>
      <Link href="/" className="rounded-pill bg-ink-raised px-5 py-2 hover:bg-ink-line"><T>Back to Chess Preparatory</T></Link>
    </div>
  );
}
