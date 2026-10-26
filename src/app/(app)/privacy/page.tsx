import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Chess Preparatory",
  description:
    "How Chess Preparatory collects, uses, stores, and deletes your data across the web app and the Android app.",
};

const LAST_UPDATED = "14 August 2026";
const CONTACT_EMAIL = "bakutarb@gmail.com";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Privacy Policy</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Last updated {LAST_UPDATED}
      </p>

      <p className="mt-6 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        Chess Preparatory (&ldquo;the app&rdquo;) helps chess players prepare for opponents by
        collecting published game records and organising preparation sessions. This policy covers
        both the web app and the Android app, which share one account and one backend.
      </p>

      <Section title="What we collect">
        <p>
          <strong className="font-medium text-gray-900 dark:text-gray-100">Account details.</strong>{" "}
          Your username, email address, and first and last name, which you supply at signup. Your
          password is stored only as a salted cryptographic hash &mdash; we never store or have
          access to the password itself. We send a six-digit code to your email address to confirm
          you own it.
        </p>
        <p>
          <strong className="font-medium text-gray-900 dark:text-gray-100">Chess data.</strong>{" "}
          Games, opponent profiles, opening statistics, and performance summaries. Some of this you
          enter or upload yourself (for example, PGN files). The rest is fetched on your instruction
          from public sources &mdash; Chess.com, Lichess, chess-results.org, and FIDE &mdash; and is
          published game data, not private information.
        </p>
        <p>
          <strong className="font-medium text-gray-900 dark:text-gray-100">
            Preparation sessions.
          </strong>{" "}
          The titles, notes, dates and times of the prep sessions you schedule, and whether you
          marked them complete.
        </p>
        <p>
          <strong className="font-medium text-gray-900 dark:text-gray-100">
            Your conversations with Mbaku.
          </strong>{" "}
          The questions you ask the in-app assistant and the answers it gives are stored against
          your account, so a conversation can be continued later. See{" "}
          <em>The Mbaku assistant</em> below for who else sees them.
        </p>
        <p>
          <strong className="font-medium text-gray-900 dark:text-gray-100">
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
          <strong className="font-medium text-gray-900 dark:text-gray-100">Profile photo.</strong>{" "}
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
          <strong className="font-medium text-gray-900 dark:text-gray-100">not</strong> contain the
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
          optional. <strong className="font-medium text-gray-900 dark:text-gray-100">The Android
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
          You can give us your FIDE ID when you register, or later on your profile. It is optional
          and the app works without it.
        </p>
        <p>
          If you provide one we use it to look up your public rating record on FIDE and to find your
          published tournament games on chess-results.org, so the app can show your own play back to
          you. Both sources are public. We send them your FIDE ID and nothing else about you &mdash;
          not your name as we hold it, not your email.
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
          Four other companies process data on our behalf, each for one purpose and nothing else:
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            <strong className="font-medium text-gray-900 dark:text-gray-100">Railway</strong> and{" "}
            <strong className="font-medium text-gray-900 dark:text-gray-100">Vercel</strong> &mdash;
            hosting and database.
          </li>
          <li>
            <strong className="font-medium text-gray-900 dark:text-gray-100">Sentry</strong> &mdash;
            crash reports from the Android app, as described above.
          </li>
          <li>
            <strong className="font-medium text-gray-900 dark:text-gray-100">Anthropic</strong>{" "}
            &mdash; the questions you ask Mbaku and the opponent summary sent with them.
          </li>
          <li>
            <strong className="font-medium text-gray-900 dark:text-gray-100">Paystack</strong>{" "}
            &mdash; the email address and amount for a tip you choose to send, on the web app only.
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
          To delete your entire account and all data associated with it, email{" "}
          <a
            className="font-medium text-brand-600 hover:underline dark:text-brand-400"
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
            className="font-medium text-brand-600 hover:underline dark:text-brand-400"
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
