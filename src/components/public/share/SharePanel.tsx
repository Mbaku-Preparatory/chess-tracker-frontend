"use client";

import { useEffect, useId, useState } from "react";

import { CheckIcon, FacebookIcon, InstagramIcon, LinkIcon, MoreIcon, ShareIcon, WhatsAppIcon, XIcon } from "./shareIcons";

/**
 * One "Share" button that opens a row of places to share: WhatsApp, Facebook,
 * Instagram (when there is a picture), X, Copy, and More (the phone's own
 * share sheet) where there is one. Used by the chess personality test.
 *
 * WhatsApp first: it is how chess is shared in India and Kenya, the two
 * biggest audiences. Facebook takes only the link (its own preview carries
 * the rest); the others take `text` and the link.
 *
 * Instagram takes no links from the web, only pictures, so it appears only
 * with a `picture`: on a phone it goes through the share sheet, where
 * Instagram is a choice; elsewhere the picture downloads and the link is
 * copied to paste with it. The picture is fetched when the row opens, not on
 * the tap: Safari opens the share sheet only straight from a tap.
 */
export type ShareVia = "whatsapp" | "facebook" | "instagram" | "x" | "copy" | "device";

export function SharePanel({
  label = "Share",
  text,
  url,
  copyText = url,
  copyLabel = "Copy link",
  picture,
  onShared,
}: {
  label?: string;
  text: string;
  url: string;
  /** What Copy puts on the clipboard: the link, unless a result reads better as text. */
  copyText?: string;
  copyLabel?: string;
  picture?: { src: string; filename: string };
  onShared?: (via: ShareVia) => void;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function"), []);

  // Keyed on the strings, not the object: callers pass a fresh one each render.
  const pictureSrc = picture?.src;
  const pictureName = picture?.filename;
  useEffect(() => {
    if (!open || !pictureSrc || !pictureName || file) return;
    let live = true;
    fetch(pictureSrc)
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((blob) => live && setFile(new File([blob], pictureName, { type: blob.type || "image/png" })))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [open, pictureSrc, pictureName, file]);

  const sent = (via: ShareVia) => onShared?.(via);

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      return false;
    }
  };

  const onCopy = async () => {
    if (!(await copy(copyText))) return setStatus("Couldn't copy. Copy the address from your browser instead.");
    setCopied(true);
    setStatus(copyText === url ? "Link copied." : "Copied: paste it anywhere.");
    sent("copy");
    window.setTimeout(() => setCopied(false), 2000);
  };

  const onInstagram = async () => {
    if (!picture) return;
    if (file && navigator.canShare?.({ files: [file] })) {
      // Some apps keep only the picture: the link rides in the text for the rest.
      navigator.share({ files: [file], text: `${text} ${url}` }).then(() => sent("instagram"), () => {});
      return;
    }
    const copiedLink = await copy(url);
    const href = file ? URL.createObjectURL(file) : picture.src;
    const a = Object.assign(document.createElement("a"), { href, download: picture.filename });
    document.body.append(a);
    a.click();
    a.remove();
    if (file) window.setTimeout(() => URL.revokeObjectURL(href), 10_000);
    setStatus(
      copiedLink
        ? "Picture downloaded and link copied: post the picture on Instagram and paste the link."
        : "Picture downloaded: post it on Instagram.",
    );
    sent("instagram");
  };

  const link = (href: string, via: ShareVia) => ({ href, target: "_blank", rel: "noopener", onClick: () => sent(via) });
  const option = "group flex w-16 flex-col items-center gap-1.5 text-[12px] text-ink-muted hover:text-ink-text";
  const circle = "flex h-12 w-12 items-center justify-center rounded-full bg-ink-raised transition-transform group-hover:scale-105";
  const message = `${text} ${url}`;

  return (
    <div className="flex flex-col items-start gap-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2.5 rounded-pill bg-accent px-6 py-3 text-[16px] font-[480] text-accent-on hover:bg-accent-soft"
      >
        <ShareIcon />
        {label}
      </button>

      {open && (
        // Three across on a phone (two even rows of six), one row from sm up.
        <div id={panelId} className="grid w-full grid-cols-3 justify-items-center gap-y-4 rounded-xl bg-ink-raised/50 p-4 sm:flex sm:w-auto sm:flex-wrap sm:gap-x-2 sm:p-3">
          <a className={option} {...link(`https://wa.me/?text=${encodeURIComponent(message)}`, "whatsapp")}>
            <span className={circle} style={{ color: "#25D366" }}>
              <WhatsAppIcon className="h-6 w-6" />
            </span>
            WhatsApp
          </a>
          <a className={option} {...link(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "facebook")}>
            <span className={circle} style={{ color: "#0866FF" }}>
              <FacebookIcon className="h-6 w-6" />
            </span>
            Facebook
          </a>
          {picture && (
            <button type="button" className={option} onClick={onInstagram}>
              <span className={circle} style={{ color: "#E4405F" }}>
                <InstagramIcon className="h-6 w-6" />
              </span>
              Instagram
            </button>
          )}
          <a className={option} {...link(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "x")}>
            <span className={`${circle} text-ink-text`}>
              <XIcon className="h-5 w-5" />
            </span>
            X
          </a>
          <button type="button" className={option} onClick={onCopy}>
            <span className={`${circle} text-ink-text`}>{copied ? <CheckIcon /> : <LinkIcon />}</span>
            {copied ? "Copied" : copyLabel}
          </button>
          {canShare && (
            <button type="button" className={option} onClick={() => navigator.share({ text, url }).then(() => sent("device"), () => {})}>
              <span className={`${circle} text-ink-text`}>
                <MoreIcon />
              </span>
              More
            </button>
          )}
        </div>
      )}
      <p role="status" aria-live="polite" className="text-[14px] text-ink-muted empty:hidden">
        {status}
      </p>
    </div>
  );
}
