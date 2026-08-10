"use client";

import { useState } from "react";

import { api } from "@/lib/api";
import type { PlayerAccount } from "@/types";
import { userMessage } from "@/lib/apiError";

interface ConnectedAccountManagerProps {
  slug: string;
  platform: "chesscom" | "lichess";
  accounts: PlayerAccount[];
  onUpdated?: () => void | Promise<void>;
}

const PLATFORM_LABEL = {
  chesscom: "Chess.com",
  lichess: "Lichess",
} as const;

export function ConnectedAccountManager({
  slug,
  platform,
  accounts,
  onUpdated,
}: ConnectedAccountManagerProps) {
  const platformAccounts = accounts.filter((account) => account.platform === platform);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAction(
    key: string,
    action: () => Promise<void>
  ) {
    setBusyKey(key);
    setError(null);
    setMessage(null);

    try {
      await action();
      await onUpdated?.();
    } catch (err: unknown) {
      setError(userMessage(err, "Action failed."));
    } finally {
      setBusyKey(null);
    }
  }

  async function handleDelink(account: PlayerAccount, deleteGames: boolean) {
    const confirmed = window.confirm(
      deleteGames
        ? `Delink ${PLATFORM_LABEL[platform]} account "${account.username}" and also delete all imported games tied to it? This cannot be undone.`
        : `Delink ${PLATFORM_LABEL[platform]} account "${account.username}" and keep its imported games?`
    );
    if (!confirmed) return;

    await runAction(`delink-${account.id}-${deleteGames ? "purge" : "keep"}`, async () => {
      const result = await api.removeAccount(slug, account.id, { deleteGames });
      setMessage(
        deleteGames
          ? `Delinked ${result.username} and deleted ${result.deleted_games} imported game${result.deleted_games === 1 ? "" : "s"}.`
          : `Delinked ${result.username}. Imported games were kept.`
      );
    });
  }

  async function handleDeleteGames(account: PlayerAccount) {
    const confirmed = window.confirm(
      `Delete all imported ${PLATFORM_LABEL[platform]} games tied to "${account.username}" but keep the account linked? This cannot be undone.`
    );
    if (!confirmed) return;

    await runAction(`games-${account.id}`, async () => {
      const result = await api.deleteImportedGamesForAccount(slug, account.id);
      setMessage(
        `Deleted ${result.deleted_games} imported game${result.deleted_games === 1 ? "" : "s"} for ${result.username}. The account is still linked.`
      );
    });
  }

  return (
    <div className="mt-5 rounded-xl border border-gray-200 bg-white/80 p-4">
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-gray-900">
          Connected {PLATFORM_LABEL[platform]} accounts
        </h4>
        <p className="mt-1 text-xs text-gray-500">
          You can delink an account, delete only its imported games, or do both.
        </p>
      </div>

      {platformAccounts.length === 0 ? (
        <p className="text-sm text-gray-500">
          No {PLATFORM_LABEL[platform]} accounts linked yet.
        </p>
      ) : (
        <div className="space-y-3">
          {platformAccounts.map((account) => {
            const isBusy = busyKey?.includes(`-${account.id}`) ?? false;

            return (
              <div
                key={account.id}
                className="rounded-lg border border-gray-200 bg-white p-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {account.username}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Imported games from this linked account can be removed separately.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!!busyKey}
                      onClick={() => handleDelink(account, false)}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isBusy && busyKey?.startsWith("delink") ? "Working…" : "Delink only"}
                    </button>
                    <button
                      type="button"
                      disabled={!!busyKey}
                      onClick={() => handleDeleteGames(account)}
                      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busyKey === `games-${account.id}` ? "Deleting…" : "Delete imported games"}
                    </button>
                    <button
                      type="button"
                      disabled={!!busyKey}
                      onClick={() => handleDelink(account, true)}
                      className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busyKey === `delink-${account.id}-purge` ? "Deleting…" : "Delink + delete games"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {message && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </div>
      )}
      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
