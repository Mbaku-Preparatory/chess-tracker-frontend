"use client";

import { useState } from "react";
import { api } from "@/lib/api";

/**
 * Ask Mbaku about one opponent, answered from the games we hold on them.
 *
 * The thread is held server-side: we send a conversation id and the backend
 * replays the earlier turns, so "why did you say that?" has something to refer
 * back to. The client never tells the server what Mbaku said last turn, which
 * is what stops a forged assistant turn steering the answer.
 *
 * The suggested questions are the categories from AI-ASSISTANT-EVALS.md,
 * including the deliberately unanswerable one — asking about a rating trend and
 * getting "we don't store rating history" back is Mbaku working correctly, and
 * keeping it one tap away makes that easy to re-check as the prompt is tuned.
 */

// Provisional — the backend carries the same name in ASSISTANT_NAME.
const ASSISTANT_NAME = "Mbaku";

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

interface Turn {
  role: "user" | "assistant";
  content: string;
}

interface AskAssistantProps {
  slug: string;
  playerName?: string;
}

export function AskAssistant({ slug, playerName }: AskAssistantProps) {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setQuestion("");
    setTurns((prev) => [...prev, { role: "user", content: trimmed }]);

    try {
      const result = await api.askAboutPlayer(slug, trimmed, conversationId);
      setConversationId(result.conversation_id);
      setTurns((prev) => [...prev, { role: "assistant", content: result.answer }]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setTurns([]);
    setConversationId(null);
    setError(null);
  }

  return (
    <div className="card overflow-hidden border-2 border-brand-200 shadow-sm dark:border-dark-border">
      <div className="flex items-center gap-3 bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-lg text-white">
          &#128172;
        </span>
        <div className="flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-100">
            Ask {ASSISTANT_NAME}
          </p>
          <h3 className="text-lg font-bold text-white">
            {playerName
              ? `${ASSISTANT_NAME} on ${playerName}`
              : `Ask ${ASSISTANT_NAME} about this player`}
          </h3>
        </div>
        {turns.length > 0 && (
          <button
            type="button"
            onClick={reset}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-brand-100 transition-colors hover:bg-white/10"
          >
            New chat
          </button>
        )}
      </div>

      <div className="space-y-4 p-6">
        {turns.length > 0 && (
          <div className="space-y-3">
            {turns.map((turn, i) =>
              turn.role === "user" ? (
                <p
                  key={i}
                  className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-brand-600 px-4 py-2.5 text-sm font-medium text-white"
                >
                  {turn.content}
                </p>
              ) : (
                <div
                  key={i}
                  className="max-w-[95%] space-y-3 rounded-2xl rounded-bl-sm bg-brand-50/60 px-4 py-3 dark:bg-dark-elevated"
                >
                  {/* Mbaku writes prose with blank lines between paragraphs;
                      render those as paragraphs rather than a wall of text. */}
                  {turn.content
                    .split(/\n{2,}/)
                    .filter((p) => p.trim())
                    .map((para, j) => (
                      <p
                        key={j}
                        className="whitespace-pre-line text-sm leading-relaxed text-gray-800 dark:text-gray-200"
                      >
                        {para.trim()}
                      </p>
                    ))}
                </div>
              )
            )}
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-4 text-sm text-gray-500 dark:bg-dark-elevated dark:text-gray-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />
            Reading {playerName ? `${playerName}'s` : "their"} games…
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

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
            placeholder={
              turns.length
                ? "Ask a follow-up…"
                : `Ask ${ASSISTANT_NAME} — e.g. which opening do they score worst with?`
            }
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

        {turns.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTED.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                disabled={loading}
                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50 dark:border-dark-border dark:bg-dark-elevated dark:text-gray-300 dark:hover:bg-dark-surface"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-400 dark:text-gray-500">
          Answered only from the games imported for this player.
        </p>
      </div>
    </div>
  );
}
