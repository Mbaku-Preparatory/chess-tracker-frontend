"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Avatar } from "@/components/avatar/Avatar";
import { AvatarPicker } from "@/components/avatar/AvatarPicker";
import { usePreferences } from "@/components/PreferencesProvider";
import { useSubscription } from "@/components/subscription/SubscriptionProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import { avatarSrc, defaultAvatar } from "@/lib/avatars";
import { enabledProviders, providerName, startLinkedSignIn, type Provider } from "@/lib/linkedAuth";
import { ProviderLogo } from "@/components/ui/ProviderLogo";
import { BILLING_PATH, formatDate } from "@/lib/subscription";
import { THEME_KEY } from "@/lib/theme";
import { clearAuth, setAuth } from "@/redux/actions/auth";
import { setTheme } from "@/redux/actions/theme";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import type { Linked, Me, Preferences } from "@/types";
import { T } from "@/components/T";
import { useLocale, useT } from "@/hooks/useT";
import { msg } from "@/lib/i18n";

const input =
  "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-dark-border dark:bg-dark-elevated dark:text-gray-100 dark:placeholder-gray-500";
const label = "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300";

function Section({ title, hint, children, danger = false }: { title: string; hint?: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <section className={`card p-6 ${danger ? "border-red-200 dark:border-red-900/50" : ""}`}>
      <h2 className={`text-lg font-semibold ${danger ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-100"}`}>{title}</h2>
      {hint && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{hint}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Where their subscription stands, in a line; the details are on Billing.
 * Hidden until the paywall is switched on. */
function SubscriptionSection() {
  const { subscription: sub } = useSubscription();
  const t = useT();
  const locale = useLocale();
  if (!sub || !sub.enforced) return null;
  const date = (iso: string | null) => formatDate(iso, locale);
  const line =
    sub.state === "staff" ? t("Staff access: never expires.")
      : sub.state === "tester" ? t("Tester access: never expires.")
      : sub.state === "free" ? t("Free in your country: nothing to pay.")
      : sub.state === "trial" ? t("Free trial until {date}.", { date: date(sub.access_until) })
        : sub.state === "paid" ? t("Subscribed until {date}.", { date: date(sub.access_until) })
          : sub.state === "negotiated" ? t("Access until {date}, as agreed with us.", { date: date(sub.access_until) })
            : sub.paid_until ? t("Your access ended on {date}.", { date: date(sub.paid_until) }) : t("No subscription yet.");
  return (
    <Section title={t("Subscription")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-700 dark:text-gray-300">{line}</p>
        <Link href={BILLING_PATH} className="btn-secondary">
          {t("Billing")}
        </Link>
      </div>
    </Section>
  );
}

function Note({ kind, children }: { kind: "ok" | "error"; children: React.ReactNode }) {
  return (
    <p role={kind === "error" ? "alert" : "status"} className={`text-sm ${kind === "ok" ? "text-brand-700 dark:text-brand-300" : "text-red-600 dark:text-red-400"}`}>
      {children}
    </p>
  );
}

const SWITCHES: { key: keyof Preferences; title: string; hint: string }[] = [
  {
    key: "mbaku_enabled",
    title: msg("Mbaku AI"),
    hint: msg("The assistant that answers questions about a player from their games, under Ask in their prep."),
  },
  {
    key: "bot_speech",
    title: msg("The bot talks"),
    hint: msg("While you play a player's bot, it tells you which of their games you are in and when you leave them."),
  },
  {
    key: "import_emails",
    title: msg("Email me when an import finishes"),
    hint: msg("Ticks “Email me when this is done” for you when you import a player's games."),
  },
];

function Switch({ on, onChange, labelledBy }: { on: boolean; onChange: (on: boolean) => void; labelledBy: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-labelledby={labelledBy}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-bg ${
        on ? "bg-brand-600" : "bg-gray-300 dark:bg-dark-muted"
      }`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

/**
 * The account holder's settings: who they are, which features they want, how
 * the app looks, their password, and deleting the account.
 */
export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const email = useAppSelector((s) => s.auth.email);
  const themeMode = useAppSelector((s) => s.theme.mode);
  const { preferences, update, setAvatar: showAvatar } = usePreferences();
  const t = useT();

  const [me, setMe] = useState<Me | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Account
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nameNote, setNameNote] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [picking, setPicking] = useState(false);

  // Features
  const [switchError, setSwitchError] = useState<string | null>(null);

  // Appearance: "system" when no choice is saved.
  const [themeChoice, setThemeChoice] = useState<"light" | "dark" | "system">("system");

  // Connected accounts
  // Which provider this page was just sent back from, connected.
  const [justConnected, setJustConnected] = useState<Provider | null>(null);

  // Password
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordNote, setPasswordNote] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [changing, setChanging] = useState(false);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteWord, setDeleteWord] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api
      .getMe()
      .then((m) => {
        setMe(m);
        setFirstName(m.first_name);
        setLastName(m.last_name);
      })
      .catch((err) => setLoadError(t(userMessage(err, msg("Couldn't load your settings.")))));
    // Back from connecting an account (components/LinkedReturn).
    const back = new URLSearchParams(window.location.search).get("connected");
    if (back === "lichess" || back === "chesscom") {
      setJustConnected(back);
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }
    try {
      const saved = localStorage.getItem(THEME_KEY);
      setThemeChoice(saved === "light" || saved === "dark" ? saved : "system");
    } catch {
      // Blocked storage: "system" is what applies anyway.
    }
  }, []);

  if (loadError) return <p className="py-16 text-center text-sm text-red-600 dark:text-red-400">{loadError}</p>;
  if (!me) return <div className="mx-auto mt-4 h-96 max-w-2xl animate-pulse rounded-xl bg-gray-100 dark:bg-dark-elevated" />;

  const defaultSrc = avatarSrc(defaultAvatar(email ?? me.email));
  const faceSrc = me.avatar ? avatarSrc(me.avatar) : defaultSrc;
  const nameChanged = firstName.trim() !== me.first_name || lastName.trim() !== me.last_name;

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    setNameNote(null);
    try {
      const m = await api.setMyName(firstName.trim(), lastName.trim());
      setMe(m);
      setFirstName(m.first_name);
      setLastName(m.last_name);
      setNameNote({ kind: "ok", text: t("Saved.") });
    } catch (err) {
      setNameNote({ kind: "error", text: t(userMessage(err, msg("Couldn't save your name."))) });
    } finally {
      setSavingName(false);
    }
  }

  async function pickAvatar(avatar: number | null) {
    setPicking(false);
    const before = me;
    setMe((m) => (m ? { ...m, avatar } : m));
    showAvatar(avatar);
    try {
      setMe(await api.setMyAvatar(avatar));
    } catch (err) {
      setMe(before);
      showAvatar(before?.avatar ?? null);
      setNameNote({ kind: "error", text: t(userMessage(err, msg("Couldn't save that avatar."))) });
    }
  }

  async function flip(key: keyof Preferences, on: boolean) {
    setSwitchError(null);
    try {
      await update({ [key]: on });
    } catch (err) {
      setSwitchError(t(userMessage(err, msg("Couldn't save that. Try again."))));
    }
  }

  function chooseTheme(choice: "light" | "dark" | "system") {
    setThemeChoice(choice);
    dispatch(setTheme(choice === "system" ? null : choice));
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordNote(null);
    if (next !== confirm) return setPasswordNote({ kind: "error", text: t("The new passwords don't match.") });
    setChanging(true);
    try {
      const tokens = await api.changePassword(hasPassword ? current : "", next);
      // Every other session was signed out; these keep this one.
      dispatch(setAuth({ token: tokens.access, refreshToken: tokens.refresh, email: tokens.email }));
      setCurrent("");
      setNext("");
      setConfirm("");
      setPasswordNote({
        kind: "ok",
        text: hasPassword
          ? t("Password changed. Your other devices have been signed out.")
          : t("Password set. You can now sign in with your email too."),
      });
      if (me) setMe({ ...me, has_password: true });
    } catch (err) {
      setPasswordNote({ kind: "error", text: t(userMessage(err, msg("Couldn't change your password."))) });
    } finally {
      setChanging(false);
    }
  }

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteAccount(hasPassword ? { password: deletePassword } : { confirm_email: deletePassword });
      // Signing out sends AuthGate to /login, which reads this and says so.
      // Not a query string: AuthGate's own redirect would drop it.
      try {
        sessionStorage.setItem("cs_account_deleted", "1");
      } catch {
        // Blocked storage: they land on the login page without the note.
      }
      dispatch(clearAuth());
    } catch (err) {
      setDeleteError(t(userMessage(err, msg("Couldn't delete your account."))));
      setDeleting(false);
    }
  }

  // A Google sign-up has no password until they set one here.
  const hasPassword = me.has_password !== false;
  // How an account with no password gets in, for the Password hint.
  const signsInWith = me.linked?.lichess ? "Lichess" : me.linked?.chesscom ? "Chess.com" : "Google";

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("Settings")} subtitle={me.email} />

      <div className="flex flex-col gap-6">
        <Section title={t("Account")}>
          <div className="mb-6 flex items-center gap-4">
            <button
              type="button"
              onClick={() => setPicking(true)}
              aria-label={t("Change your avatar")}
              className="rounded-full outline-none ring-brand-500 hover:ring-2 focus-visible:ring-2"
            >
              <Avatar src={faceSrc} size={64} />
            </button>
            <div className="min-w-0">
              <p className="truncate font-medium text-gray-900 dark:text-gray-100">{me.username}</p>
              <button type="button" onClick={() => setPicking(true)} className="text-sm text-brand-600 underline dark:text-brand-300">
                {t("Change avatar")}
              </button>
            </div>
          </div>
          <form onSubmit={saveName} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="first-name" className={label}>{t("First name")}</label>
                <input id="first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={input} autoComplete="given-name" />
              </div>
              <div>
                <label htmlFor="last-name" className={label}>{t("Last name")}</label>
                <input id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} className={input} autoComplete="family-name" />
              </div>
            </div>
            <div>
              <p className={label}>{t("Email")}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">{me.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={!nameChanged || savingName} className="btn-primary disabled:opacity-50">
                {savingName ? t("Saving…") : t("Save")}
              </button>
              {nameNote && <Note kind={nameNote.kind}>{nameNote.text}</Note>}
            </div>
          </form>
        </Section>

        <SubscriptionSection />

        <Section title={t("Features")} hint={t("Turn parts of the app on or off. Saved on your account, so they follow you to every device.")}>
          <ul className="flex flex-col divide-y divide-gray-100 dark:divide-dark-border">
            {SWITCHES.map((s) => (
              <li key={s.key} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p id={`switch-${s.key}`} className="font-medium text-gray-900 dark:text-gray-100">{t(s.title)}</p>
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{t(s.hint)}</p>
                </div>
                <Switch on={preferences[s.key]} onChange={(on) => flip(s.key, on)} labelledBy={`switch-${s.key}`} />
              </li>
            ))}
          </ul>
          {switchError && <div className="mt-3"><Note kind="error">{switchError}</Note></div>}
        </Section>

        <Section title={t("Appearance")}>
          <div role="radiogroup" aria-label={t("Theme")} className="flex w-fit gap-1 rounded-lg bg-gray-100 p-1 dark:bg-dark-elevated">
            {(
              [
                ["light", msg("Light")],
                ["dark", msg("Dark")],
                ["system", msg("Match my device")],
              ] as const
            ).map(([value, text]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={themeChoice === value}
                onClick={() => chooseTheme(value)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium ${
                  themeChoice === value
                    ? "bg-white text-gray-900 shadow dark:bg-dark-surface dark:text-gray-100"
                    : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {t(text)}
              </button>
            ))}
          </div>
          {themeChoice === "system" && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {themeMode === "dark" ? t("Your device is set to dark right now.") : t("Your device is set to light right now.")}
            </p>
          )}
        </Section>

        <Section title={t("Connected accounts")} hint={t("Sign in with these instead of your password.")}>
          <div className="flex flex-col gap-5">
            {enabledProviders().map((provider) => (
              <ConnectedRow
                key={provider}
                provider={provider}
                username={me.linked?.[provider]?.username ?? null}
                hasPassword={hasPassword}
                justConnected={justConnected === provider}
                onLinked={(linked) => setMe({ ...me, linked })}
              />
            ))}
          </div>
        </Section>

        <Section
          title={t("Password")}
          hint={
            hasPassword
              ? t("Changing it signs you out on your other devices.")
              : t("You sign in with {provider}. Set a password to sign in with your email address too.", { provider: signsInWith })
          }
        >
          <form onSubmit={changePassword} className="flex flex-col gap-4">
            {hasPassword && (
              <div>
                <label htmlFor="current-password" className={label}>{t("Current password")}</label>
                <input id="current-password" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className={input} autoComplete="current-password" required />
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="new-password" className={label}>{t("New password")}</label>
                <input id="new-password" type="password" value={next} onChange={(e) => setNext(e.target.value)} className={input} autoComplete="new-password" required />
              </div>
              <div>
                <label htmlFor="confirm-password" className={label}>{t("New password again")}</label>
                <input id="confirm-password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} autoComplete="new-password" required />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={changing || (hasPassword && !current) || !next || !confirm} className="btn-primary disabled:opacity-50">
                {changing ? t("Saving…") : hasPassword ? t("Change password") : t("Set password")}
              </button>
              {passwordNote && <Note kind={passwordNote.kind}>{passwordNote.text}</Note>}
            </div>
          </form>
        </Section>

        <Section
          title={t("Delete account")}
          hint={t("Deletes your account and everything in it: your opponents and their games, your prep, your books and your imports. This cannot be undone.")}
          danger
        >
          {!deleteOpen ? (
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              {t("Delete my account…")}
            </button>
          ) : (
            <form onSubmit={deleteAccount} className="flex flex-col gap-4">
              <div>
                {hasPassword ? (
                  <>
                    <label htmlFor="delete-password" className={label}>{t("Your password")}</label>
                    <input id="delete-password" type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} className={input} autoComplete="current-password" required />
                  </>
                ) : (
                  <>
                    <label htmlFor="delete-password" className={label}>{t("Your email address")}</label>
                    <input id="delete-password" type="email" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} className={input} autoComplete="off" spellCheck={false} required />
                  </>
                )}
              </div>
              <div>
                <label htmlFor="delete-word" className={label}>
                  {/* The word stays DELETE in every language: it is what the box checks for. */}
                  <T vars={{ word: <span className="font-mono font-semibold">DELETE</span> }}>{"Type {word} to confirm"}</T>
                </label>
                <input id="delete-word" value={deleteWord} onChange={(e) => setDeleteWord(e.target.value)} className={input} autoComplete="off" spellCheck={false} required />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={deleting || !deletePassword || deleteWord !== "DELETE"}
                  className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? t("Deleting…") : t("Delete my account forever")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteOpen(false);
                    setDeletePassword("");
                    setDeleteWord("");
                    setDeleteError(null);
                  }}
                  className="btn-secondary"
                >
                  {t("Cancel")}
                </button>
              </div>
              {deleteError && <Note kind="error">{deleteError}</Note>}
            </form>
          )}
        </Section>
      </div>

      {picking && (
        <AvatarPicker
          title={t("Your avatar")}
          current={me.avatar}
          defaultSrc={defaultSrc}
          defaultLabel={t("Default")}
          onPick={pickAvatar}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  );
}

/** One provider in Connected accounts: who is connected, and the button to
 * connect or disconnect. Disconnect waits for a password while this provider
 * may be the account's only way in. */
function ConnectedRow({
  provider,
  username,
  hasPassword,
  justConnected,
  onLinked,
}: {
  provider: Provider;
  username: string | null;
  hasPassword: boolean;
  justConnected: boolean;
  onLinked: (linked: Linked) => void;
}) {
  const name = providerName(provider);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const t = useT();
  useEffect(() => {
    if (justConnected) setNote({ kind: "ok", text: t("{name} connected. You can now sign in with it.", { name }) });
  }, [justConnected, name]);

  async function disconnect() {
    setBusy(true);
    setNote(null);
    try {
      const { linked } = await api.disconnectLinked(provider);
      onLinked(linked);
      setNote({ kind: "ok", text: `${name} disconnected.` });
    } catch (err) {
      setNote({ kind: "error", text: t(userMessage(err, t("Couldn't disconnect {name}.", { name }))) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center text-gray-900 dark:text-gray-100">
            <ProviderLogo provider={provider} size={28} />
          </span>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{username ? t("Connected as {name}", { name: username }) : t("Not connected")}</p>
          </div>
        </div>
        {username ? (
          <button type="button" onClick={disconnect} disabled={busy || !hasPassword} className="btn-secondary disabled:opacity-50">
            {busy ? t("Disconnecting…") : t("Disconnect")}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setBusy(true);
              startLinkedSignIn(provider, "connect").catch(() => setBusy(false));
            }}
            disabled={busy}
            className="btn-secondary disabled:opacity-50"
          >
            {busy ? t("Opening {name}…", { name }) : t("Connect {name}", { name })}
          </button>
        )}
      </div>
      {username && !hasPassword && (
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          {t("{name} may be how you sign in, so set a password below before disconnecting it.", { name })}
        </p>
      )}
      {note && (
        <div className="mt-3">
          <Note kind={note.kind}>{note.text}</Note>
        </div>
      )}
    </div>
  );
}
