"use client";

import { useRef, useState } from "react";

/** Copy the PGN, or send it on, with the page's link when there is one. */
export function ShareSheet({ pgn, title, url, onClose }: { pgn: string; title: string; url: string | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  async function copy() {
    await navigator.clipboard.writeText(pgn);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // A link is short and opens the analysis; a PGN is what a chess program
  // wants. Messages get both when the page has a public address.
  const snippet = pgn.slice(0, 1500);
  const message = url ? `${title}\n${url}` : `${title}\n\n${snippet}`;
  const open = (href: string) => window.open(href, "_blank", "noopener");

  const platforms = [
    {
      label: copied ? "Copied!" : "Copy PGN", bg: "bg-gray-700", action: copy,
      icon: copied
        ? <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        : <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-4 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
    },
    {
      label: "WhatsApp", bg: "bg-[#25D366]", action: () => open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`),
      icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>,
    },
    {
      label: "Telegram", bg: "bg-[#229ED9]", action: () => open(`https://t.me/share/url?url=${encodeURIComponent(url ?? "")}&text=${encodeURIComponent(url ? title : message)}`),
      icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>,
    },
    {
      label: "X / Twitter", bg: "bg-black", action: () => open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(url ? `${title}\n${url}` : `${title}\n\n${pgn.slice(0, 200)}…`)}`),
      icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>,
    },
    {
      label: "Email", bg: "bg-gray-500", action: () => window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url ? `${url}\n\n${snippet}` : snippet)}`, "_self"),
      icon: <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
    },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-2xl bg-ink-card px-5 pb-8 pt-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink-text">Share game</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-ink-raised hover:text-ink-text">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="mb-5 flex items-start gap-5 overflow-x-auto pb-1">
          {platforms.map((p) => (
            <button key={p.label} onClick={p.action} className="flex shrink-0 flex-col items-center gap-1.5">
              <span className={`flex h-12 w-12 items-center justify-center rounded-full text-white ${p.bg}`}>{p.icon}</span>
              <span className="text-[11px] text-ink-muted">{p.label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-stretch gap-2 rounded-xl border border-ink-line bg-ink-raised px-3 py-2">
          <textarea ref={textRef} readOnly value={pgn} rows={2} onClick={() => textRef.current?.select()}
            className="min-w-0 flex-1 resize-none bg-transparent font-mono text-[11px] text-ink-muted focus:outline-none" />
          <button onClick={copy} className="shrink-0 self-center rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-on hover:bg-accent-soft">
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
