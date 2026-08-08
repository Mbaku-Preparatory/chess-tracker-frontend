import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Mbaku Preparatory",
  description:
    "How Mbaku Preparatory collects, uses, stores, and deletes your data across the web app and the Android app.",
};

const LAST_UPDATED = "9 August 2026";
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
        Mbaku Preparatory (&ldquo;the app&rdquo;) helps chess players prepare for opponents by
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
      </Section>

      <Section title="What we do not collect">
        <p>
          The app contains no analytics, advertising, crash-reporting or tracking SDKs of any kind.
          We do not collect your location, contacts, calendar, call logs, or the contents of your
          device storage. We do not sell or share your data with third parties for advertising, and
          we do not use your data to build advertising profiles.
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
          hosted by Vercel. These providers process data on our behalf as infrastructure suppliers.
          Traffic between the apps and our backend is encrypted in transit over HTTPS.
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
