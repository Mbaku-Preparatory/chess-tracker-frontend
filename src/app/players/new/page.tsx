"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { MY_PLAYERS_KEY } from "@/lib/constants";
import { FederationSelect } from "@/components/ui/FederationSelect";

function addToMyPlayers(slug: string) {
  try {
    const raw = localStorage.getItem(MY_PLAYERS_KEY);
    const existing: string[] = raw ? JSON.parse(raw) : [];
    if (!existing.includes(slug)) {
      localStorage.setItem(MY_PLAYERS_KEY, JSON.stringify([...existing, slug]));
    }
  } catch {
    // Storage unavailable — proceed anyway
  }
}

export default function NewPlayerPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [federation, setFederation] = useState("");
  const [fideId, setFideId] = useState("");
  const [chesscomUsername, setChesscomUsername] = useState("");
  const [lichessUsername, setLichessUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const player = await api.createPlayer({
        full_name: fullName.trim(),
        ...(federation.trim() ? { federation: federation.trim() } : {}),
        ...(fideId.trim() ? { fide_id: fideId.trim() } : {}),
        ...(chesscomUsername.trim() ? { chesscom_username: chesscomUsername.trim() } : {}),
        ...(lichessUsername.trim() ? { lichess_username: lichessUsername.trim() } : {}),
      });
      addToMyPlayers(player.slug);
      // If they gave a Chess.com username, land on that tab; otherwise default
      const source = chesscomUsername.trim() ? "chesscom" : lichessUsername.trim() ? "lichess" : "chesscom";
      router.push(`/players/${player.slug}/import?source=${source}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create player. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-900">My Opponents</Link>
        <span>/</span>
        <span className="text-gray-900">Add Opponent</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add opponent</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create a profile, then import their games to generate a prep report.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5 p-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Full name */}
        <div>
          <label htmlFor="full-name" className="mb-1.5 block text-sm font-medium text-gray-700">
            Full name <span className="text-red-500">*</span>
          </label>
          <input
            id="full-name"
            type="text"
            required
            autoFocus
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="e.g. Magnus Carlsen"
          />
        </div>

        {/* Chess.com + Lichess */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="chesscom" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <span className="flex h-4 w-4 items-center justify-center rounded bg-[#7fa650]">
                <svg viewBox="0 0 24 24" fill="white" className="h-2.5 w-2.5">
                  <path d="M10 2a1 1 0 00-1 1v1H8a3 3 0 00-3 3v1H4a1 1 0 000 2h1v1a3 3 0 003 3h.17l-1.9 4.55A1 1 0 007.2 20h9.6a1 1 0 00.93-1.45L15.83 14H16a3 3 0 003-3v-1h1a1 1 0 000-2h-1V7a3 3 0 00-3-3h-1V3a1 1 0 00-1-1h-4z" />
                </svg>
              </span>
              Chess.com
              <span className="text-xs font-normal text-gray-400">optional</span>
            </label>
            <input
              id="chesscom"
              type="text"
              value={chesscomUsername}
              onChange={(e) => setChesscomUsername(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="username"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div>
            <label htmlFor="lichess" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <span className="flex h-4 w-4 items-center justify-center rounded bg-[#b05000]">
                <svg viewBox="0 0 24 24" fill="white" className="h-2.5 w-2.5">
                  <path d="M19 22H5v-2h14v2M13 2a3 3 0 00-3 3c0 .88.39 1.67 1 2.22V8l-3 1-2 4h2v1H6l-1 3h14l-1-3h-2v-1h2l-2-4-3-1V7.22c.61-.55 1-1.34 1-2.22a3 3 0 00-1-2.24V2h-1z" />
                </svg>
              </span>
              Lichess
              <span className="text-xs font-normal text-gray-400">optional</span>
            </label>
            <input
              id="lichess"
              type="text"
              value={lichessUsername}
              onChange={(e) => setLichessUsername(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="username"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Federation + FIDE ID */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="federation" className="mb-1.5 block text-sm font-medium text-gray-700">
              Federation
              <span className="ml-1 text-xs font-normal text-gray-400">optional</span>
            </label>
            <FederationSelect
              id="federation"
              value={federation}
              onChange={setFederation}
            />
          </div>

          <div>
            <label htmlFor="fide-id" className="mb-1.5 block text-sm font-medium text-gray-700">
              FIDE ID
              <span className="ml-1 text-xs font-normal text-gray-400">optional</span>
            </label>
            <input
              id="fide-id"
              type="text"
              value={fideId}
              onChange={(e) => setFideId(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="e.g. 1503014"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={loading || !fullName.trim()}
            className="btn-primary disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create & import games →"}
          </button>
          <Link href="/" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
