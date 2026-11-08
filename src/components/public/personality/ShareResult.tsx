"use client";

import { track } from "@vercel/analytics";
import { useEffect, useId, useState } from "react";

import type { PersonalityType } from "@/lib/chessPersonality";
import { SITE_URL } from "@/lib/site";

import { CheckIcon, FacebookIcon, InstagramIcon, LinkIcon, MoreIcon, ShareIcon, WhatsAppIcon, XIcon } from "./shareIcons";

/**
 * "Share result", which opens a row of places to share it. The link carries
 * the sliders (?s=), so whoever opens it sees the same result, and the type's
 * own preview image shows in the chat. WhatsApp first: it is how chess is
 * shared in India and Kenya, the two biggest audiences.
 *
 * Instagram takes no links from the web, only pictures. So its button shares
 * the type's story picture (story.png): on a phone through the share sheet,
 * where Instagram is one of the choices; elsewhere it downloads the picture
 * and copies the link to paste with it. The picture is fetched when the row
 * opens, not on the tap: Safari only lets a page open the share sheet
 * straight from a tap, with no waiting in between.
 */
export function ShareResult({ type, path, mine }: { type: PersonalityType; path: string; mine: boolean }) {
  const panelId = useId();
  const url = `${SITE_URL}${path}`;
  const text = mine
    ? `I'm ${type.name} at chess. Which chess personality are you?`
    : `${type.name}: ${type.tagline} Which chess personality are you?`;
  const [open, setOpen] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [story, setStory] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function"), []);

  useEffect(() => {
    if (!open || story) return;
    let live = true;
    fetch(`/chess-personality/${type.slug}/story.png`)
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((blob) => live && setStory(new File([blob], `${type.slug}-chess-personality.png`, { type: "image/png" })))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [open, story, type.slug]);

  const sent = (via: string) => track("Chess personality shared", { type: type.slug, via });

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      return false;
    }
  };

  const onCopy = async () => {
    if (!(await copyLink())) return setStatus("Couldn't copy. Copy the address from your browser instead.");
    setCopied(true);
    setStatus("Link copied.");
    sent("copy");
    window.setTimeout(() => setCopied(false), 2000);
  };

  const onInstagram = async () => {
    if (story && navigator.canShare?.({ files: [story] })) {
      // Some apps keep only the picture: the link rides in the text for the rest.
      navigator.share({ files: [story], text: `${text} ${url}` }).then(() => sent("instagram"), () => {});
      return;
    }
    const copiedLink = await copyLink();
    const href = story ? URL.createObjectURL(story) : `/chess-personality/${type.slug}/story.png`;
    const a = Object.assign(document.createElement("a"), { href, download: `${type.slug}-chess-personality.png` });
    document.body.append(a);
    a.click();
    a.remove();
    if (story) window.setTimeout(() => URL.revokeObjectURL(href), 10_000);
    setStatus(
      copiedLink
        ? "Story picture downloaded and link copied: post the picture on Instagram and paste the link."
        : "Story picture downloaded: post it on Instagram.",
    );
    sent("instagram");
  };

  const link = (href: string, via: string) => ({ href, target: "_blank", rel: "noopener", onClick: () => sent(via) });
  const option = "flex w-16 flex-col items-center gap-1.5 text-[12px] text-ink-muted hover:text-ink-text";
  const circle = "flex h-12 w-12 items-center justify-center rounded-full bg-ink-raised transition-transform group-hover:scale-105";

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
        Share result
      </button>

      {open && (
        // Three across on a phone (two even rows with More), one row from sm up.
        <div id={panelId} className="grid w-full grid-cols-3 justify-items-center gap-y-4 rounded-xl bg-ink-raised/50 p-4 sm:flex sm:w-auto sm:flex-wrap sm:gap-x-2 sm:p-3">
          <a className={`group ${option}`} {...link(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "whatsapp")}>
            <span className={circle} style={{ color: "#25D366" }}>
              <WhatsAppIcon className="h-6 w-6" />
            </span>
            WhatsApp
          </a>
          <a className={`group ${option}`} {...link(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "facebook")}>
            <span className={circle} style={{ color: "#0866FF" }}>
              <FacebookIcon className="h-6 w-6" />
            </span>
            Facebook
          </a>
          <button type="button" className={`group ${option}`} onClick={onInstagram}>
            <span className={circle} style={{ color: "#E4405F" }}>
              <InstagramIcon className="h-6 w-6" />
            </span>
            Instagram
          </button>
          <a
            className={`group ${option}`}
            {...link(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "x")}
          >
            <span className={`${circle} text-ink-text`}>
              <XIcon className="h-5 w-5" />
            </span>
            X
          </a>
          <button type="button" className={`group ${option}`} onClick={onCopy}>
            <span className={`${circle} text-ink-text`}>{copied ? <CheckIcon /> : <LinkIcon />}</span>
            {copied ? "Copied" : "Copy link"}
          </button>
          {canShare && (
            <button
              type="button"
              className={`group ${option}`}
              onClick={() => navigator.share({ title: type.name, text, url }).then(() => sent("device"), () => {})}
            >
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
