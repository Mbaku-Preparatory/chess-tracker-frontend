"use client";

import { useState } from "react";
import { api } from "@/lib/api";

/**
 * Ask a question about one opponent, answered from the games we hold on them.
 *
 * The suggested questions are not decoration — they are the categories from
 * AI-ASSISTANT-EVALS.md, including the deliberately unanswerable one. Asking
 * "what's her rating trend" and getting "we don't store rating history" back is
 * the assistant working correctly, and having that a tap away makes the
 * behaviour easy to keep checking as the prompt is tuned.
 */

const SUGGESTED = [
  "Which openings does this player play most?",
  "Where do they score worst?",
  "What's their record against stronger opponents?",
  "How should I prepare against them?",
  "What's their rating trend over the last three years?",
];

// Matches QUESTION_MAX_LENGTH in players/services/assistant.py. The backend
// rejects anything longer, so stop it here rather than round-tripping a 400.
const MAX_QUESTION = 500;

interface AskAssistantProps {
  slug: string;
  playerName?: string;
}

export function AskAssistant({ slug, playerName }: AskAssistantProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asked, setAsked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setAnswer(null);
    setAsked(trimmed);

    try {
      const result = await api.askAboutPlayer(slug, trimmed);
      setAnswer(result.answer);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card overflow-hidden border-2 border-brand-200 shadow-sm dark:border-dark-border">
      <div className="bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-lg text-white">
            &#128172;
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-100">
              Ask the assistant
            </p>
            <h3 className="text-lg font-bold text-white">
              {playerName ? `Questions about ${playerName}` : "Ask about this player"}
            </h3>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
          className="space-y-3"
        >
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value.slice(0, MAX_QUESTION))}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter for a new line — chat convention.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(question);
              }
            }}
            rows={2}
            placeholder="e.g. which opening do they score worst with?"
            disabled={loading}
            className="input w-full resize-none"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {question.length}/{MAX_QUESTION}
            </span>
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="btn-primary text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Thinking…" : "Ask"}
            </button>
          </div>
        </form>

        <div className="flex flex-wrap gap-2">
          {SUGGESTED.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setQuestion(s);
                ask(s);
              }}
              disabled={loading}
              className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50 dark:border-dark-border dark:bg-dark-elevated dark:text-gray-300 dark:hover:bg-dark-surface"
            >
              {s}
            </button>
          ))}
        </div>

        {loading && (
          <div className="rounded-xl bg-gray-50 p-4 dark:bg-dark-elevated">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />
              Reading {playerName ? `${playerName}'s` : "their"} games…
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        {answer && !loading && (
          <div className="space-y-2">
            {asked && (
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {asked}
              </p>
            )}
            {/* The model writes plain prose with blank lines between paragraphs;
                render those as paragraphs rather than one wall of text. */}
            <div className="space-y-3 rounded-xl bg-brand-50/50 p-4 dark:bg-dark-elevated">
              {answer
                .split(/\n{2,}/)
                .filter((p) => p.trim())
                .map((para, i) => (
                  <p
                    key={i}
                    className="whitespace-pre-line text-sm leading-relaxed text-gray-800 dark:text-gray-200"
                  >
                    {para.trim()}
                  </p>
                ))}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Answered only from the games imported for this player.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
