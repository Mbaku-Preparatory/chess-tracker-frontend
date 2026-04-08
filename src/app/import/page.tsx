"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import { ImportResultPanel } from "@/components/import/ImportResultPanel";
import type { PGNImportResult, Player } from "@/types";

type Mode = "self" | "opponent";
type PlayerSelection =
  | { type: "existing"; slug: string; name: string }
  | { type: "new"; name: string }
  | null;

// ── Player picker ─────────────────────────────────────────────────────────────

function PlayerPicker({
  mode,
  value,
  onChange,
}: {
  mode: Mode;
  value: PlayerSelection;
  onChange: (v: PlayerSelection) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Player[]>([]);
  const [searching, setSearching] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const label = mode === "self" ? "You are" : "Opponent is";

  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setSearching(true);
    try {
      const res = await api.getPlayers(q, 1);
      setResults(res.results.slice(0, 8));
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    onChange(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  }

  function handleSelect(player: Player) {
    onChange({ type: "existing", slug: player.slug, name: player.full_name });
    setQuery(player.full_name);
    setOpen(false);
    setShowNew(false);
  }

  function handleNewNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setNewName(val);
    onChange(val.trim() ? { type: "new", name: val.trim() } : null);
  }

  function handleToggleNew() {
    setShowNew((s) => !s);
    setOpen(false);
    setQuery("");
    setNewName("");
    onChange(null);
  }

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const isSelected = value !== null;

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-700">
        {label}
        <span className="ml-1 text-red-500">*</span>
      </p>

      {!showNew ? (
        <div ref={containerRef} className="relative">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              {searching ? (
                <svg className="h-4 w-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </div>
            <input
              type="text"
              value={query}
              onChange={handleQueryChange}
              onFocus={() => results.length > 0 && setOpen(true)}
              placeholder="Search existing players…"
              className={`block w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 ${
                isSelected && value?.type === "existing"
                  ? "border-brand-500 bg-brand-50 focus:border-brand-500 focus:ring-brand-500"
                  : "border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500"
              }`}
            />
            {isSelected && value?.type === "existing" && (
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <svg className="h-4 w-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>

          {open && results.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
              {results.map((p) => (
                <li key={p.slug}>
                  <button
                    type="button"
                    onClick={() => handleSelect(p)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-brand-50"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                      {p.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <span className="font-medium text-gray-800">{p.full_name}</span>
                    {p.federation && (
                      <span className="ml-auto text-xs text-gray-400">{p.federation}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <input
          type="text"
          value={newName}
          onChange={handleNewNameChange}
          placeholder={mode === "self" ? "Your name (as in PGN)" : "Opponent's full name"}
          autoFocus
          className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      )}

      <button
        type="button"
        onClick={handleToggleNew}
        className="mt-1.5 text-xs text-brand-600 hover:text-brand-800"
      >
        {showNew ? "← Search existing players" : "+ Create new player"}
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const [pgn, setPgn] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("self");
  const [playerSelection, setPlayerSelection] = useState<PlayerSelection>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PGNImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = pgn.trim().length > 0 && playerSelection !== null && !loading;

  // ── File handling ──────────────────────────────────────────────────────────

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

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!playerSelection) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const payload =
        playerSelection.type === "existing"
          ? { pgn_text: pgn, mode, player_slug: playerSelection.slug }
          : { pgn_text: pgn, mode, player_name: playerSelection.name };

      const data = await api.importPGN(payload);
      setResult(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Import failed. Check your PGN and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setResult(null);
    setError(null);
    setPgn("");
    setFileName(null);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Import Games</h1>
        <p className="mt-1 text-sm text-gray-500">
          Paste or upload a .pgn file to build a player dossier and analyse openings.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Mode */}
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-gray-700">These are…</legend>
          <div className="flex gap-4">
            {(
              [
                { value: "self", label: "My games" },
                { value: "opponent", label: "Opponent's games" },
              ] as { value: Mode; label: string }[]
            ).map(({ value, label }) => (
              <label
                key={value}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  mode === value
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="mode"
                  value={value}
                  checked={mode === value}
                  onChange={() => {
                    setMode(value);
                    setResult(null);
                    setPlayerSelection(null);
                  }}
                  className="accent-brand-600"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        {/* Player selection */}
        <PlayerPicker
          mode={mode}
          value={playerSelection}
          onChange={(v) => {
            setPlayerSelection(v);
            setResult(null);
          }}
        />

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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
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
            className={`relative rounded-lg ${dragging ? "ring-2 ring-brand-500 ring-offset-1" : ""}`}
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
              placeholder={`[Event "Tournament"]\n[White "Your Name"]\n[Black "Opponent"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 ...`}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 font-mono text-xs text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="mt-1 flex items-center justify-between">
            {fileName ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-brand-700">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {fileName}
              </span>
            ) : (
              <p className="text-xs text-gray-400">
                Paste PGN above, upload a file, or drag &amp; drop a .pgn here.
              </p>
            )}
            {(pgn || fileName) && (
              <button type="button" onClick={handleReset} className="text-xs text-gray-400 hover:text-gray-600">
                Clear
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className={`btn-primary flex items-center gap-2 ${!canSubmit ? "cursor-not-allowed opacity-50" : ""}`}
          >
            {loading && (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {loading ? "Importing…" : "Import Games"}
          </button>

          {(result || pgn) && !loading && (
            <button type="button" onClick={handleReset} className="btn-secondary">
              Clear
            </button>
          )}
        </div>
      </form>

      {result && <ImportResultPanel result={result} />}
    </div>
  );
}
