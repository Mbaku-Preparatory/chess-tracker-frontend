import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Chess Preparatory",
  description:
    "How Chess Preparatory collects, uses, stores, and deletes your data across the web app and the Android app.",
};

const LAST_UPDATED = "6 November 2026";
const CONTACT_EMAIL = "bakutarb@gmail.com";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-[21px] font-[480] text-ink-text">{title}</h2>
      <div className="mt-3 space-y-3 text-[16px] leading-[1.6] text-ink-muted">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl py-8">
      <h1 className="text-[32px] font-[480] leading-[1.15] tracking-[0.015em] text-ink-text sm:text-[42px]">Privacy Policy</h1>
      <p className="mt-2 text-[14px] text-ink-faint">
        Last updated {LAST_UPDATED}
      </p>

      <p className="mt-6 text-[16px] leading-[1.6] text-ink-muted">
        Chess Preparatory (&ldquo;the app&rdquo;) helps chess players prepare for opponents by
        collecting published game records and organising preparation sessions. This policy covers
        both the web app and the Android app, which share one account and one backend.
      </p>

      <Section title="What we collect">
        <p>
          <strong className="font-[480] text-ink-text">Account details.</strong>{" "}
          Your username, email address, and first and last name, which you supply at signup. Your
          password is stored only as a salted cryptographic hash &mdash; we never store or have
          access to the password itself. We send a six-digit code to your email address to confirm
          you own it.
        </p>
        <p>
          <strong className="font-[480] text-ink-text">Signing in with Google.</strong>{" "}
          If you choose &ldquo;Continue with Google&rdquo;, Google tells us your name, your email
          address, and that Google has verified that address. That is all we receive: no password,
          and no access to your Gmail, contacts, files or anything else in your Google account. We
          use these details to create your account or sign you in to the one you already have with
          that email address, and for nothing else. An account made this way has no password until
          you set one in Settings. Google handles its side of the sign-in under its own privacy
          policy.
        </p>
        <p>
          <strong className="font-[480] text-ink-text">Signing in with Lichess.</strong>{" "}
          If you choose &ldquo;Continue with Lichess&rdquo;, or connect Lichess in Settings, Lichess
          tells us your Lichess account ID, your username, the name on your profile if you gave one,
          and your email address. We keep the account ID and username, to recognise you next time
          and to show which Lichess account is connected; the name and email go on your account as
          they would at signup. We do not keep access to your Lichess account: the permission
          Lichess gives us is used once to read these details, then cancelled. Disconnecting Lichess
          in Settings removes the link.
        </p>
        <p>
          <strong className="font-[480] text-ink-text">Signing in with Chess.com.</strong>{" "}
          If you choose &ldquo;Continue with Chess.com&rdquo;, or connect Chess.com in Settings,
          Chess.com tells us your Chess.com account ID, your username, your email address, and
          whether Chess.com has verified that address. We keep the account ID and username, for the
          same reasons as with Lichess, and the email goes on your account. We ask Chess.com for
          nothing else: not your games, friends or ratings through this sign-in, and we do not keep
          access to your Chess.com account. Disconnecting Chess.com in Settings removes the link.
        </p>
        <p>
          <strong className="font-[480] text-ink-text">Chess data.</strong>{" "}
          Games, opponent profiles, opening statistics, and performance summaries. Some of this you
          enter or upload yourself (for example, PGN files). The rest is fetched on your instruction
          from public sources &mdash; Chess.com, Lichess, chess-results.org, and FIDE &mdash; and is
          published game data, not private information.
        </p>
        <p>
          <strong className="font-[480] text-ink-text">
            Preparation sessions.
          </strong>{" "}
          The titles, notes, dates and times of the prep sessions you schedule, and whether you
          marked them complete.
        </p>
        <p>
          <strong className="font-[480] text-ink-text">
            Your conversations with Mbaku.
          </strong>{" "}
          The questions you ask the in-app assistant and the answers it gives are stored against
          your account, so a conversation can be continued later. See{" "}
          <em>The Mbaku assistant</em> below for who else sees them.
        </p>
        <p>
          <strong className="font-[480] text-ink-text">
            Crash reports.
          </strong>{" "}
          When the Android app hits an error, it sends a diagnostic report. See{" "}
          <em>Crash reporting</em> below for exactly what that contains.
        </p>
      </Section>

      <Section title="What we do not collect">
        <p>
          The app contains no advertising or tracking SDKs, and shows no ads. We do not collect your
          location, contacts, calendar, call logs, or the contents of your device storage. We do not
          sell your data, we do not share it with anyone for advertising, and we do not use it to
          build advertising profiles.
        </p>
        <p>
          <strong className="font-[480] text-ink-text">Website visits.</strong>{" "}
          The website uses Vercel Web Analytics to count page views: which pages are visited, the
          referring site, and the country, browser, and device type. It sets no cookies, and it does
          not identify you or follow you across days or across other sites.
        </p>
        <p>
          <strong className="font-[480] text-ink-text">Profile photo.</strong>{" "}
          If you set a profile picture in the Android app, the app asks for permission to read the
          image you select. That image is stored only in local storage on your own device and is
          never uploaded to our servers. Uninstalling the app removes it.
        </p>
      </Section>

      <Section title="Notifications">
        <p>
          Reminders for scheduled prep sessions are generated entirely on your device by Android&apos;s
          local notification scheduler. The app does not use push notifications, does not register a
          push token, and no reminder ever passes through our servers or any third-party push
          service. Declining the notification permission disables reminders and affects nothing else.
        </p>
      </Section>

      <Section title="Crash reporting">
        <p>
          The Android app uses Sentry to report crashes and errors, so that a bug which only happens
          on someone else&apos;s phone can still be found and fixed. A report contains the error and
          its stack trace, your device model and Android version, the app version, and a trail of
          the screens you visited and buttons you pressed just beforehand. It does{" "}
          <strong className="font-[480] text-ink-text">not</strong> contain the
          contents of anything you typed &mdash; not your questions to Mbaku, not your notes, not
          your opponents&apos; names.
        </p>
        <p>
          If you are signed in, your email address is attached to the report. That is a deliberate
          choice and we would rather say so plainly than bury it: during this early review period it
          lets us tell one person&apos;s crash from another&apos;s and ask what you were doing when
          it happened. Sentry processes this on our behalf and it is never used for marketing.
        </p>
        <p>
          Crash reporting is off entirely in development builds, and no performance or session
          tracking is enabled.
        </p>
      </Section>

      <Section title="The Mbaku assistant">
        <p>
          Mbaku answers questions about an opponent in plain language. To do that, your question and
          a summary of the data we already hold about that opponent &mdash; their name, ratings,
          game results, openings, and your head-to-head record &mdash; are sent to Anthropic, which
          operates the language model that writes the answer.
        </p>
        <p>
          The summary is built from the chess data described above, which is public game data plus
          what you entered yourself. Your email address, your password, and your prep session notes
          are never included. Anthropic processes this on our behalf to generate the reply and does
          not use it to train models.
        </p>
      </Section>

      <Section title="Supporting the project (web only)">
        <p>
          The web app has a page where you can send the developer a tip. It buys you nothing &mdash;
          every feature is available whether or not you ever use it &mdash; and it is entirely
          optional. <strong className="font-[480] text-ink-text">The Android
          app does not include this.</strong>
        </p>
        <p>
          Tips are handled by Paystack, which processes the payment. When you start one we send
          Paystack the email address on your account, because they require one per transaction, plus
          the amount and an internal reference. You enter your M-Pesa number or card details on
          Paystack&rsquo;s own page, not ours &mdash; we never see them and they never reach our
          servers.
        </p>
        <p>
          We keep a record of the payment: our reference, the amount, whether it succeeded, and
          which account started it. Paystack keeps its own records as the payment processor and is
          responsible for them under its own privacy policy.
        </p>
      </Section>

      <Section title="Your FIDE ID">
        <p>
          We no longer ask for your own FIDE ID. Earlier versions of the app let you give it when you
          registered, to show your own play back to you. If you gave one, it and the public games
          found with it stay on your account until you delete the account or ask us to remove them.
        </p>
      </Section>

      <Section title="How we use your data">
        <p>
          Your data is used only to operate the features you are using: authenticating you,
          displaying and analysing the games you have collected, generating opponent preparation, and
          reminding you about sessions you scheduled. We do not use it for any other purpose.
        </p>
      </Section>

      <Section title="Where your data is stored">
        <p>
          Application data is stored in a PostgreSQL database hosted by Railway. The web app is
          hosted by Vercel. Traffic between the apps and our backend is encrypted in transit over
          HTTPS.
        </p>
        <p>
          These other companies handle data for us, each for one purpose and nothing else:
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            <strong className="font-[480] text-ink-text">Railway</strong> and{" "}
            <strong className="font-[480] text-ink-text">Vercel</strong> &mdash;
            hosting and database. Vercel also provides the website&apos;s visit counts, as
            described above.
          </li>
          <li>
            <strong className="font-[480] text-ink-text">Sentry</strong> &mdash;
            crash reports from the Android app, as described above.
          </li>
          <li>
            <strong className="font-[480] text-ink-text">Anthropic</strong>{" "}
            &mdash; the questions you ask Mbaku and the opponent summary sent with them.
          </li>
          <li>
            <strong className="font-[480] text-ink-text">Paystack</strong>{" "}
            &mdash; the email address and amount for a tip you choose to send, on the web app only.
          </li>
          <li>
            <strong className="font-[480] text-ink-text">Google</strong>{" "}
            &mdash; only if you sign in with Google: it confirms who you are and gives us your name
            and email address.
          </li>
          <li>
            <strong className="font-[480] text-ink-text">Lichess</strong>{" "}
            &mdash; only if you sign in with Lichess or connect it: it confirms which Lichess account
            is yours and gives us its username, profile name and email address.
          </li>
          <li>
            <strong className="font-[480] text-ink-text">Chess.com</strong>{" "}
            &mdash; only if you sign in with Chess.com or connect it: it confirms which Chess.com
            account is yours and gives us its username and email address.
          </li>
        </ul>
        <p>
          These are infrastructure suppliers, not partners we share data with commercially. None of
          them receives your password, which exists only as a hash on our own database.
        </p>
      </Section>

      <Section title="Data retention and deletion">
        <p>
          We keep your data for as long as your account exists. You can delete individual games,
          opponents and prep sessions at any time from within the app, which removes them from our
          database.
        </p>
        <p>
          To delete your entire account and all data associated with it, use{" "}
          <strong className="font-[480] text-ink-text">Delete account</strong> in Settings on the
          web app, which removes it immediately. Or email{" "}
          <a
            className="font-[480] text-accent-soft underline-offset-4 hover:underline"
            href={`mailto:${CONTACT_EMAIL}?subject=Account%20deletion%20request`}
          >
            {CONTACT_EMAIL}
          </a>{" "}
          from the address registered to your account. We will action the request and confirm within
          30 days.
        </p>
      </Section>

      <Section title="Children">
        <p>
          The app is not directed at children under 13, and we do not knowingly collect data from
          them. If you believe a child has created an account, contact us and we will remove it.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          If this policy changes materially, we will update the date at the top of this page and,
          where the change affects how we handle data you have already given us, notify you by email.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about this policy or your data:{" "}
          <a
            className="font-[480] text-accent-soft underline-offset-4 hover:underline"
            href={`mailto:${CONTACT_EMAIL}`}
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>
    </div>
  );
}
