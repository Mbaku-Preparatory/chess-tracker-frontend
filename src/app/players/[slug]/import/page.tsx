"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { api } from "@/lib/api";
import { ChessComImportSection } from "@/components/import/ChessComImportSection";
import { ImportResultPanel } from "@/components/import/ImportResultPanel";
import type { PlayerDetail, PGNImportResult } from "@/types";

type Color = "auto" | "white" | "black";

const COLOR_OPTIONS: { value: Color; label: string; hint: string }[] = [
  {
    value: "auto",
    label: "Auto-detect",
    hint: "Match by player name in PGN headers",
  },
  {
    value: "white",
    label: "Always White",
    hint: "Player had the white pieces in every game",
  },
  {
    value: "black",
    label: "Always Black",
    hint: "Player had the black pieces in every game",
  },
];

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PlayerImportPage() {
  const { slug } = useParams<{ slug: string }>();

  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [playerLoading, setPlayerLoading] = useState(true);
  const [playerError, setPlayerError] = useState<string | null>(null);

  const [pgn, setPgn] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [color, setColor] = useState<Color>("auto");
  const [nameOverride, setNameOverride] = useState(""); // only used when color=auto

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PGNImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load the player
  useEffect(() => {
    if (!slug) return;
    setPlayerLoading(true);
    api
      .getPlayerDetail(slug)
      .then((p) => {
        setPlayer(p);
        setNameOverride(p.full_name);
      })
      .catch(() => setPlayerError("Player not found."))
      .finally(() => setPlayerLoading(false));
  }, [slug]);

  // ── File handling ────────────────────────────────────────────────────────

  function readFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === "string") {
        setPgn(text);
        setFileName(file.name);
        setResult(null);
        setError(null);
      }
    };
    reader.onerror = () => setError("Could not read the file.");
    reader.readAsText(file, "utf-8");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) readFile(file);
    e.target.value = "";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  const canSubmit = pgn.trim().length > 0 && !loading && (color !== "auto" || nameOverride.trim().length > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!slug) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const data = await api.importPGN({
        pgn_text: pgn,
        mode: "self",
        player_slug: slug,
        color,
        // For auto mode, pass nameOverride so the backend can match by name
        ...(color === "auto" ? { player_name: nameOverride.trim() } : {}),
      });
      setResult(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Import failed. Check your PGN and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setPgn("");
    setFileName(null);
    setResult(null);
    setError(null);
  }

  // ── Loading / error states ───────────────────────────────────────────────

  if (playerLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="mt-4 h-4 w-64 animate-pulse rounded bg-gray-100" />
      </div>
    );
  }

  if (playerError || !player) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-500">{playerError ?? "Player not found."}</p>
        <Link href="/players" className="btn-primary mt-4 inline-flex">
          Back to players
        </Link>
      </div>
    );
  }

  const initials = player.full_name
    .split(" ")
    .map((n) => n[0])
    .join("");

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href={`/players/${slug}`} className="hover:text-gray-900">
          {player.full_name}
        </Link>
        <span>/</span>
        <span className="text-gray-900">Import Games</span>
      </nav>

      {/* Player badge */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-100 text-lg font-bold text-brand-700">
          {initials}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Games</h1>
          <p className="text-sm text-gray-500">
            Adding games for <span className="font-medium text-gray-700">{player.full_name}</span>
          </p>
        </div>
      </div>

      {/* Chess.com auto-import */}
      <div className="mb-8 space-y-4">
        <ChessComImportSection
          slug={slug}
          savedUsername={player.chesscom_username}
        />

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-medium text-gray-400">or import PGN manually</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Color selection */}
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-gray-700">
            {player.full_name} played as…
          </legend>
          <div className="grid grid-cols-3 gap-3">
            {COLOR_OPTIONS.map(({ value, label, hint }) => (
              <label
                key={value}
                className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-left transition-colors ${
                  color === value
                    ? "border-brand-600 bg-brand-50"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="color"
                  value={value}
                  checked={color === value}
                  onChange={() => {
                    setColor(value);
                    setResult(null);
                  }}
                  className="sr-only"
                />
                <span
                  className={`text-sm font-semibold ${
                    color === value ? "text-brand-700" : "text-gray-800"
                  }`}
                >
                  {value === "white" && (
                    <span className="mr-1.5 inline-block h-3 w-3 rounded-full border border-gray-300 bg-white align-middle shadow-sm" />
                  )}
                  {value === "black" && (
                    <span className="mr-1.5 inline-block h-3 w-3 rounded-full bg-gray-800 align-middle" />
                  )}
                  {label}
                </span>
                <span className="text-xs text-gray-400">{hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Name override — only shown for auto mode */}
        {color === "auto" && (
          <div>
            <label
              htmlFor="name-override"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Name in PGN headers
              <span className="ml-1 text-red-500">*</span>
            </label>
            <input
              id="name-override"
              type="text"
              value={nameOverride}
              onChange={(e) => setNameOverride(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              How the player&rsquo;s name appears in the White/Black PGN headers. Partial match
              is fine.
            </p>
          </div>
        )}

        {/* PGN input */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="pgn-input" className="text-sm font-medium text-gray-700">
              PGN
              <span className="ml-1 text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              Upload .pgn
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pgn,text/plain"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative rounded-lg transition-colors ${dragging ? "ring-2 ring-brand-500 ring-offset-1" : ""}`}
          >
            {dragging && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-brand-400 bg-brand-50/80">
                <p className="text-sm font-medium text-brand-700">Drop your .pgn file here</p>
              </div>
            )}
            <textarea
              id="pgn-input"
              value={pgn}
              onChange={(e) => {
                setPgn(e.target.value);
                setFileName(null);
                setResult(null);
              }}
              rows={12}
              spellCheck={false}
              placeholder={`[Event "Tournament"]\n[White "${color === "white" ? player.full_name : "Opponent"}"]\n[Black "${color === "black" ? player.full_name : "Opponent"}"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 ...`}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 font-mono text-xs text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="mt-1 flex items-center justify-between">
            {fileName ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-brand-700">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                {fileName}
              </span>
            ) : (
              <p className="text-xs text-gray-400">
                Paste PGN above, upload a file, or drag &amp; drop a .pgn here.
              </p>
            )}
            {(pgn || fileName) && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className={`btn-primary flex items-center gap-2 ${!canSubmit ? "cursor-not-allowed opacity-50" : ""}`}
          >
            {loading && (
              <svg
                className="h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {loading ? "Importing…" : "Import Games"}
          </button>
          <Link href={`/players/${slug}`} className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>

      {result && <ImportResultPanel result={result} />}
    </div>
  );
}
