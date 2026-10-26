import Link from "next/link";

export default function PlayerNotFound() {
  return (
    <div className="flex flex-col items-start gap-4 py-24">
      <h1 className="text-[28px] font-[480]">No rated player with that FIDE ID</h1>
      <p className="max-w-[60ch] text-ink-muted">
        Profiles exist for every player rated by FIDE. Check the ID on ratings.fide.com.
      </p>
      <Link href="/" className="rounded-pill bg-ink-raised px-5 py-2 hover:bg-ink-line">Back to Chess Preparatory</Link>
    </div>
  );
}
