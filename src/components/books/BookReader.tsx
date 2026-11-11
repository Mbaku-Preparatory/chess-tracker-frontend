"use client";

/**
 * Reading a book: the owner's own PDF, page by page, with every move and
 * diagram the server found lit up over it. Tap one and the board shows that
 * position; ← and → step through the line it belongs to. The board is also
 * playable: any legal move from the position starts the reader's own line,
 * kept beside the book's, and ← steps back into the book.
 *
 * On a desktop the board is on the left, as tall as the screen allows, with a
 * narrow column beside it for the line and the engine, and the book on the
 * right; the reader takes the window's width for that, not the page's column.
 * On a phone or tablet the book has the whole screen, and the board slides up
 * from the bottom when a move is tapped; swiping it down, ✕, or the phone's
 * back button puts it away.
 *
 * The owner's PDF comes from this device (lib/bookFiles.ts), never from the
 * server, which kept only the index (lib/books.ts, ReaderIndex). A demo book
 * (lib/publicBook.ts) is the one exception: the server serves both, and the
 * PDF is kept on the device after the first visit. pdf.js draws the pages,
 * only those near the screen, and lets go of the rest.
 *
 * A book opens while the server is still reading it: the index then covers
 * only the first pages, and the rest of the book shows as plain pages until
 * it catches up. The page around it keeps the book fresh (it polls), and the
 * index is fetched again whenever it covers more. Positions keep their
 * numbers from one index to the next (backend books/services/processing.py),
 * so the move on the board stays put.
 */

import { Chess } from "chess.js";
import Link from "next/link";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { EnginePanel } from "@/components/analysis/EnginePanel";
import { useEngine } from "@/hooks/useEngine";
import { DEPTHS, useAnalysisPrefs } from "@/lib/analysisPrefs";
import Board from "@/components/analysis/Board";
import { useBookOpened } from "@/hooks/useBookOpened";
import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import { bookFile, keepBookFile, sha256Of } from "@/lib/bookFiles";
import { isConverting, type Book, type ReaderIndex } from "@/lib/books";
import { guestBookReader } from "@/lib/guestBook";
import { bookIndexUrl, bookPdfUrl } from "@/lib/publicBook";

/** Where a book's index and PDF come from: the owner's account and device,
 * or the public routes of a demo book. `book` is kept fresh by the page
 * while the server is still reading it. */
export type BookSource =
  | { kind: "own"; book: Book }
  | { kind: "public"; slug: string; title: string; sha256: string }
  // Tried without an account: read with its key (lib/guestBook.ts).
  | { kind: "guest"; key: string; book: Book };

async function publicFetch<T>(url: string, read: (r: Response) => Promise<T>): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(response.status === 404 ? "This book is no longer available." : "The book could not be loaded. Try again in a moment.");
  return read(response);
}

type Node = ReaderIndex["nodes"][number];

const FEN = 0, SAN = 1, PARENT = 2, NEXT = 3;
const LAST_PAGE_KEY = (id: string) => `book-reader-page:${id}`;
/** The reader's least height on a big screen, and the space left under it. */
const MIN_FRAME = 520;
const FRAME_GAP = 32; // the app's own padding under its pages
/** On a big screen the reader spans the window, less this on each side. */
const WIDE_MARGIN = 24;
const EMPTY_FEN = "8/8/8/8/8/8/8/8 w - - 0 1";

/** A move played on the board rather than read from the book. */
type OwnMove = { san: string; fen: string; from: string; to: string };
/** The reader's own line: moves played from one position of the book. One at
 * a time; playing from another position starts afresh. */
type OwnLine = { node: number; moves: OwnMove[] };

const clean = (san: string) => san.replace(/[+#!?]/g, "");

/** "12." or "12..." for the move played from `fen`. */
function numberOf(fen: string): string {
  const f = fen.split(" ");
  return `${f[5]}${f[1] === "w" ? "." : "..."}`;
}

function moveLabel(nodes: Node[], n: number): string {
  const parent = nodes[nodes[n][PARENT] as number][FEN].split(" ");
  return `${parent[5]}${parent[1] === "w" ? "." : "..."}${nodes[n][SAN]}`;
}

/** The squares the move into node n came from and went to, for the board's tint. */
function lastMove(nodes: Node[], n: number): { from: string; to: string } | null {
  const parent = nodes[n][PARENT];
  const san = nodes[n][SAN];
  if (parent === null || !san) return null;
  try {
    const m = new Chess(nodes[parent][FEN]).move(san);
    return { from: m.from, to: m.to };
  } catch {
    return null;
  }
}

/** Back to the diagram (or the start), then on along `next`. */
function lineThrough(nodes: Node[], n: number): number[] {
  const back: number[] = [];
  for (let x: number | null = n; x !== null; x = nodes[x][PARENT]) back.unshift(x);
  const forward: number[] = [];
  for (let x = nodes[n][NEXT]; x !== null && forward.length < 300; x = nodes[x][NEXT]) forward.push(x);
  return [...back, ...forward];
}

// ── The PDF, from this device ────────────────────────────────────────────────

function OpenYourCopy({ book, onFile }: { book: Pick<Book, "title" | "sha256">; onFile: (file: Blob) => void }) {
  const [problem, setProblem] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function choose(file: File) {
    setChecking(true);
    setProblem(null);
    const sha = await sha256Of(file);
    setChecking(false);
    if (sha !== book.sha256) {
      setProblem("That isn't the file you uploaded for this book — a different PDF, or another edition of it.");
      return;
    }
    await keepBookFile(sha, file);
    onFile(file);
  }

  return (
    <section className="mx-auto mt-10 flex max-w-lg flex-col items-start gap-3 rounded-xl bg-ink-card p-6">
      <h2 className="text-[17px] font-[520] text-ink-text">Open your copy of “{book.title}”</h2>
      <p className="text-[14px] leading-relaxed text-ink-muted">
        The book stays on your device: we keep only where its moves and diagrams are. Choose the same PDF you uploaded
        and this browser will remember it.
      </p>
      <label className="cursor-pointer rounded-pill bg-accent px-4 py-2 text-[14px] font-[520] text-accent-on hover:opacity-90">
        {checking ? "Checking…" : "Choose the PDF"}
        <input
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void choose(file);
          }}
        />
      </label>
      {problem && <p className="text-[14px] text-amber-700 dark:text-amber-400">{problem}</p>}
    </section>
  );
}

// ── One page ─────────────────────────────────────────────────────────────────

function PdfPage({
  doc,
  number,
  page,
  guess,
  current,
  onPick,
  register,
}: {
  doc: PDFDocumentProxy;
  number: number;
  /** Null: a page the server hasn't read yet. It is drawn without highlights,
   * sized like `guess` (the last page read) until pdf.js gives its own size. */
  page: ReaderIndex["pages"][number] | null;
  guess: { w: number; h: number };
  current: number | null;
  onPick: (node: number) => void;
  register: (number: number, el: HTMLElement | null) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [near, setNear] = useState(false);
  // An unread page's own size, from pdf.js once it is drawn.
  const [ownSize, setOwnSize] = useState<{ w: number; h: number } | null>(null);
  const unread = page === null;

  // Draw only pages near the screen; a drawn page is a few megabytes.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { rootMargin: "1500px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = canvas.current;
    if (!near || !el || !box.current) return;
    let cancelled = false;
    let task: { cancel: () => void; promise: Promise<void> } | null = null;
    (async () => {
      const pdfPage = await doc.getPage(number + 1);
      if (cancelled || !box.current) return;
      if (unread) {
        const v = pdfPage.getViewport({ scale: 1 });
        setOwnSize({ w: v.width, h: v.height });
      }
      const cssWidth = box.current.clientWidth;
      const scale = (cssWidth / pdfPage.getViewport({ scale: 1 }).width) * Math.min(window.devicePixelRatio || 1, 2);
      const viewport = pdfPage.getViewport({ scale });
      el.width = Math.floor(viewport.width);
      el.height = Math.floor(viewport.height);
      task = pdfPage.render({ canvas: el, canvasContext: el.getContext("2d")!, viewport });
      await task.promise.catch(() => undefined);
    })();
    return () => {
      cancelled = true;
      task?.cancel();
      // let go of the bitmap once the page is far away
      el.width = 0;
      el.height = 0;
    };
  }, [near, doc, number, unread]);

  const size = page ?? ownSize ?? guess;
  return (
    <div
      ref={(el) => {
        box.current = el;
        register(number, el);
      }}
      data-page={number + 1}
      className="relative w-full bg-white shadow-sm"
      style={{ aspectRatio: `${size.w} / ${size.h}` }}
    >
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" aria-label={`Page ${number + 1}`} />
      {unread && (
        <span className="absolute left-2 top-2 rounded-pill bg-ink-card/90 px-2.5 py-1 text-[12px] text-ink-muted shadow-sm">
          Moves on this page light up once it&apos;s read
        </span>
      )}
      {page?.hot.map(([x0, y0, x1, y1, node, kind], i) => {
        const on = node === current;
        const pad = kind === 0 ? 0 : 1.5;
        return (
          <button
            key={i}
            type="button"
            data-node={node}
            onClick={() => onPick(node)}
            title={kind === 0 ? "Show this position" : undefined}
            aria-label={kind === 0 ? "Diagram" : undefined}
            className={`absolute rounded-[3px] transition-colors ${
              kind === 0
                ? on
                  ? "outline outline-[3px] outline-accent"
                  : "hover:outline hover:outline-2 hover:outline-accent"
                : on
                  ? "bg-accent/50 outline outline-2 outline-accent"
                  : kind === 1
                    ? "bg-accent/25 hover:bg-accent/40"
                    : "border-b-2 border-accent bg-accent/10 hover:bg-accent/30"
            }`}
            style={{
              left: `${((x0 - pad) / size.w) * 100}%`,
              top: `${((y0 - pad) / size.h) * 100}%`,
              width: `${((x1 - x0 + 2 * pad) / size.w) * 100}%`,
              height: `${((y1 - y0 + 2 * pad) / size.h) * 100}%`,
            }}
          />
        );
      })}
      <span className="absolute -top-5 right-0 text-[11px] tabular-nums text-ink-faint">{number + 1}</span>
    </div>
  );
}

// ── The board and the line ───────────────────────────────────────────────────

function Panel({
  nodes,
  current,
  own,
  at,
  go,
  play,
  selectOwn,
  back,
  forward,
  open,
  onClose,
}: {
  nodes: Node[];
  current: number | null;
  /** The reader's own line from the current position, when there is one. */
  own: OwnMove[] | null;
  /** Where the board is on that line; -1 is the book's position itself. */
  at: number;
  go: (n: number) => void;
  /** A move on the board. False when it was not legal. */
  play: (from: string, to: string, promotion?: string) => boolean;
  selectOwn: (k: number) => void;
  /** One step back or forward, or null when there is nowhere to go. */
  back: (() => void) | null;
  forward: (() => void) | null;
  /** below lg: whether the sheet is up (from lg the panel is always there) */
  open: boolean;
  onClose: () => void;
}) {
  const onOwn = own !== null && at >= 0;
  const fen = current === null ? EMPTY_FEN : onOwn ? own[at].fen : nodes[current][FEN];
  const [prefs, setPrefs] = useAnalysisPrefs();
  const engine = useEngine(fen, { enabled: prefs.engine && current !== null, depth: DEPTHS[prefs.depth].depth, capMs: DEPTHS[prefs.depth].capMs });
  const line = useMemo(() => (current === null ? [] : lineThrough(nodes, current)), [nodes, current]);
  const moved = current === null ? null : onOwn ? own[at] : lastMove(nodes, current);
  const toMove = fen.split(" ")[1] === "w" ? "White" : "Black";
  const listRef = useRef<HTMLDivElement>(null);
  // swiping the sheet down puts it away
  const [drag, setDrag] = useState(0);
  const dragStart = useRef<number | null>(null);

  useEffect(() => {
    listRef.current?.querySelector("[data-on]")?.scrollIntoView({ block: "nearest" });
  }, [current, at]);

  const highlights = useMemo<Record<string, React.CSSProperties>>(
    () => (moved ? { [moved.from]: { backgroundColor: "rgba(255, 221, 0, 0.38)" }, [moved.to]: { backgroundColor: "rgba(255, 221, 0, 0.38)" } } : {}),
    [moved],
  );

  // A finger on the board is moving a piece, not the sheet.
  const keep = (e: React.TouchEvent) => e.stopPropagation();

  const button = "grid h-9 w-11 place-items-center rounded-pill border border-accent text-ink-text hover:bg-accent/15 disabled:opacity-35 disabled:hover:bg-transparent";

  return (
    <aside
      aria-label="Position"
      aria-hidden={!open ? true : undefined}
      onTouchStart={(e) => (dragStart.current = e.touches[0].clientY)}
      onTouchMove={(e) => dragStart.current !== null && setDrag(Math.max(0, e.touches[0].clientY - dragStart.current))}
      onTouchEnd={() => {
        if (drag > 80) onClose();
        dragStart.current = null;
        setDrag(0);
      }}
      style={drag ? { transform: `translateY(${drag}px)`, transition: "none" } : undefined}
      className={`fixed inset-x-0 bottom-0 z-30 flex max-h-[85dvh] flex-col gap-2 overflow-y-auto rounded-t-2xl bg-ink-card px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-6px_24px_rgba(0,0,0,0.18)] transition-transform duration-200 motion-reduce:transition-none ${
        open ? "translate-y-0" : "pointer-events-none translate-y-full"
      } lg:contents`}
    >
      {/* From lg this box is gone (display: contents): the board and the
          column after it are columns of the reader's grid, left of the book. */}
      {/* the handle: where a swipe down starts, on a phone */}
      <div aria-hidden="true" className="mx-auto h-1.5 w-10 shrink-0 rounded-full bg-ink-line lg:hidden" />
      {/* As tall as the reader, from lg; never so wide that the book is squeezed
          (a 1024px screen keeps about 380px for the page, a 1920px one 830px). */}
      <div
        onTouchStart={keep}
        onTouchMove={keep}
        onTouchEnd={keep}
        className="mx-auto w-full max-w-[min(100%,40dvh)] lg:order-1 lg:m-0 lg:aspect-square lg:h-[min(100%,34vw)] lg:w-auto xl:h-[min(100%,40vw)] lg:max-w-none lg:self-start"
      >
        <Board fen={fen} orientation="white" highlights={highlights} onMove={current !== null ? play : undefined} rounded="6px" />
      </div>
      {/* The narrow column beside the board, from lg; part of the sheet below that. */}
      <div className="contents lg:order-2 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:gap-3 lg:overflow-y-auto lg:rounded-xl lg:bg-ink-card lg:p-3 lg:shown-scrollbar">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-[14px] text-ink-muted" aria-live="polite">
            {current === null
              ? "Tap a move or a diagram in the book"
              : onOwn
                ? `${numberOf(at === 0 ? nodes[current][FEN] : own[at - 1].fen)}${own[at].san} · ${toMove} to move · your line`
                : nodes[current][SAN]
                  ? `${moveLabel(nodes, current)} · ${toMove} to move`
                  : `${toMove} to move`}
          </p>
          <div className="flex shrink-0 gap-2">
            <button type="button" aria-label="Previous move" disabled={back === null} onClick={() => back?.()} className={button}>
              ←
            </button>
            <button type="button" aria-label="Next move" disabled={forward === null} onClick={() => forward?.()} className={button}>
              →
            </button>
            <button type="button" aria-label="Close the board" onClick={onClose} className={`${button} lg:hidden`}>
              ✕
            </button>
          </div>
        </div>
        {(line.length > 1 || own) && current !== null && (
          <div ref={listRef} className="max-h-24 overflow-y-auto border-t border-ink-line pt-2 text-[14px] leading-7 lg:max-h-64">
            {line.map((x, i) => {
              if (!nodes[x][SAN]) return null;
              const parent = nodes[nodes[x][PARENT] as number][FEN].split(" ");
              const numbered = parent[1] === "w" || i === 1 || !nodes[line[i - 1]][SAN];
              const on = x === current && !onOwn;
              return (
                <span key={x}>
                  {numbered && <span className="ml-1 text-ink-faint">{parent[5]}{parent[1] === "w" ? "." : "..."}</span>}
                  <button
                    type="button"
                    data-on={on ? "" : undefined}
                    onClick={() => go(x)}
                    className={`rounded px-1 ${on ? "bg-accent text-accent-on" : "text-ink-text hover:bg-accent/15"}`}
                  >
                    {nodes[x][SAN]}
                  </button>{" "}
                </span>
              );
            })}
            {/* The reader's own line, under the book's, the way a variation sits under a game. */}
            {own && (
              <div className="my-1 ml-1 border-l-2 border-accent/60 pl-2 text-[13px] leading-6">
                <span className="mr-1 text-ink-faint">Your line</span>
                {own.map((m, k) => {
                  const before = k === 0 ? nodes[current][FEN] : own[k - 1].fen;
                  const numbered = k === 0 || before.split(" ")[1] === "w";
                  return (
                    <span key={k}>
                      {numbered && <span className="ml-1 text-ink-faint">{numberOf(before)}</span>}
                      <button
                        type="button"
                        data-on={at === k ? "" : undefined}
                        onClick={() => selectOwn(k)}
                        className={`rounded px-1 ${at === k ? "bg-accent text-accent-on" : "text-accent-soft hover:bg-accent/15"}`}
                      >
                        {m.san}
                      </button>{" "}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}
        <div className="hidden lg:block">
          <EnginePanel prefs={prefs} setPrefs={setPrefs} engine={engine} fen={fen} />
        </div>
        <p className="hidden text-[13px] text-ink-faint lg:block">
          Shaded moves are the game; underlined ones are variations in the text. The arrow keys step through the line. Play a move on the
          board to try a line of your own; ← brings you back to the book.
        </p>
      </div>
    </aside>
  );
}

// ── The reader ───────────────────────────────────────────────────────────────

/** Desktop width (Tailwind's lg), where the board sits beside the book. */
function useWide(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return wide;
}

export function BookReader({
  source,
  backHref = "/books",
  partNote,
  above,
}: {
  source: BookSource;
  backHref?: string;
  /** After the last page read, when the book was read only in part (the guest trial's 50 pages). */
  partNote?: React.ReactNode;
  /** Above the reader: the trial's time left. */
  above?: React.ReactNode;
}) {
  // The account's or the guest's book, as the page last heard; null for a demo book.
  const book = source.kind === "public" ? null : source.book;
  const title = source.kind === "public" ? source.title : source.book.title;
  const sha256 = source.kind === "public" ? source.sha256 : source.book.sha256;
  // Primitives, so a parent re-rendering with a fresh `source` object does
  // not fetch the book again.
  const publicId = book?.publicId ?? null;
  const guestKey = source.kind === "guest" ? source.key : null;
  const slug = source.kind === "public" ? source.slug : null;
  const id = publicId ?? `public:${slug}`;
  const [index, setIndex] = useState<ReaderIndex | null>(null);
  const [file, setFile] = useState<Blob | null | undefined>(undefined);
  const [fetching, setFetching] = useState(false);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<number | null>(null);
  // The reader's own moves, played on the board from a position of the book,
  // and where the board is on them (-1: the book's position itself).
  const [own, setOwn] = useState<OwnLine | null>(null);
  const [at, setAt] = useState(-1);
  const [sheet, setSheet] = useState(false);
  const wide = useWide();
  const [page, setPage] = useState(1);
  const pageEls = useRef(new Map<number, HTMLElement>());
  // On a big screen the pages scroll in their own pane (the window, below).
  const pane = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const index =
      guestKey !== null && publicId !== null
        ? guestBookReader(publicId, guestKey)
        : publicId !== null
          ? api.getBookReader(publicId)
          : publicFetch(bookIndexUrl(slug as string), (r) => r.json());
    index.then(
      (i) => !cancelled && setIndex(i),
      (err) => !cancelled && setError(userMessage(err)),
    );
    (async () => {
      // The device's copy first, for either kind. A demo book's comes from the
      // server once, and is kept so the next visit opens at once.
      let f = await bookFile(sha256);
      if (!f && slug !== null) {
        setFetching(true);
        try {
          f = await publicFetch(bookPdfUrl(slug), (r) => r.blob());
          await keepBookFile(sha256, f);
        } catch (err) {
          if (!cancelled) setError(userMessage(err));
          return;
        } finally {
          setFetching(false);
        }
      }
      if (!cancelled) setFile(f);
    })();
    return () => {
      cancelled = true;
    };
  }, [publicId, guestKey, slug, sha256]);

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    let task: { destroy: () => Promise<void> } | null = null;
    (async () => {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      const loading = pdfjs.getDocument({
        data: new Uint8Array(await file.arrayBuffer()),
        // Scanned books keep their pictures as JBIG2 (and some as JPEG 2000):
        // pdf.js decodes those with WebAssembly it fetches from here, and
        // without it draws the text and leaves every diagram blank.
        // Copied into public/ on install (package.json postinstall).
        wasmUrl: "/pdfjs/wasm/",
        cMapUrl: "/pdfjs/cmaps/",
        cMapPacked: true,
        standardFontDataUrl: "/pdfjs/standard_fonts/",
        iccUrl: "/pdfjs/iccs/",
      });
      task = loading;
      const loaded = await loading.promise;
      if (!cancelled) setDoc(loaded);
    })().catch(() => !cancelled && setError("This PDF could not be opened in the browser."));
    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [file]);

  // Still being read: when the server's index covers more pages than this
  // one, fetch it again. Retried on the page's next poll if it fails.
  const loadedPages = index?.pages.length ?? 0;
  const refreshing = useRef(false);
  useEffect(() => {
    if (!book || publicId === null || index === null || book.indexedPages <= loadedPages || refreshing.current) return;
    refreshing.current = true;
    (guestKey !== null ? guestBookReader(publicId, guestKey) : api.getBookReader(publicId))
      .then(setIndex, () => undefined)
      .finally(() => (refreshing.current = false));
  }, [book, publicId, guestKey, index, loadedPages]);

  useBookOpened(Boolean(index && doc), "reader", source.kind === "own" ? "account" : source.kind === "guest" ? "guest" : "demo");

  // where each node's highlight is, to bring it into view
  const placeOf = useMemo(() => {
    const m = new Map<number, number>();
    index?.pages.forEach((p, i) => p.hot.forEach((h) => !m.has(h[4]) && m.set(h[4], i)));
    return m;
  }, [index]);

  // Bring a move's highlight into view: centred beside the desktop panel,
  // in the top third on a phone, where the sheet doesn't cover it.
  const reveal = useCallback(
    (n: number, always: boolean) => {
      const pageNo = placeOf.get(n);
      const el = pageNo === undefined ? null : pageEls.current.get(pageNo)?.querySelector(`[data-node="${n}"]`);
      if (!el) return;
      if (wide) {
        if (always) el.scrollIntoView({ block: "center", behavior: "smooth" });
        return;
      }
      const top = el.getBoundingClientRect().top;
      if (always || top > window.innerHeight * 0.3 || top < 72) {
        window.scrollTo({ top: window.scrollY + top - window.innerHeight * 0.22, behavior: "smooth" });
      }
    },
    [placeOf, wide],
  );

  // The board on a phone is a history entry, so the phone's back button puts
  // it away instead of leaving the book.
  const openSheet = useCallback(() => {
    if (wide || sheet) return;
    window.history.pushState({ readerBoard: true }, "");
    setSheet(true);
  }, [wide, sheet]);
  const closeSheet = useCallback(() => {
    if (window.history.state?.readerBoard) window.history.back();
    else setSheet(false);
  }, []);
  useEffect(() => {
    const onPop = () => setSheet(Boolean(window.history.state?.readerBoard));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /** A move or diagram tapped on the page. */
  const pick = useCallback(
    (n: number) => {
      setCurrent(n);
      setAt(-1);
      openSheet();
      reveal(n, false);
    },
    [openSheet, reveal],
  );

  /** A step through the line, from the panel or the keyboard. */
  const go = useCallback(
    (n: number) => {
      setCurrent(n);
      setAt(-1);
      reveal(n, true);
    },
    [reveal],
  );

  // The own line belongs to the position it was played from; from any other
  // position the board follows the book, and a move there starts afresh.
  const ownHere = own !== null && own.node === current ? own.moves : null;
  const onOwn = ownHere !== null && at >= 0;
  const nodes = index?.nodes;

  /** A move played on the board. The book's next move walks forward along
   * the book; anything else starts, or carries on, the reader's own line. */
  const play = useCallback(
    (from: string, to: string, promotion?: string) => {
      if (!nodes || current === null) return false;
      let m;
      try {
        m = new Chess(onOwn ? ownHere[at].fen : nodes[current][FEN]).move({ from, to, promotion });
      } catch {
        return false;
      }
      const next = nodes[current][NEXT];
      if (!onOwn && next !== null && clean(nodes[next][SAN] ?? "") === clean(m.san)) {
        go(next);
        return true;
      }
      const keep = onOwn ? at + 1 : 0;
      if (ownHere && clean(ownHere[keep]?.san ?? "") === clean(m.san)) {
        setAt(keep);
        return true;
      }
      // What followed from here in the own line is let go: this is "take that
      // back and try this instead".
      setOwn({ node: current, moves: [...(ownHere ?? []).slice(0, keep), { san: m.san, fen: m.after, from: m.from, to: m.to }] });
      setAt(keep);
      return true;
    },
    [nodes, current, ownHere, onOwn, at, go],
  );

  // One step back: along the own line to the book, then up the book's line.
  // One step forward: along the book, or the own line when the book ends.
  const back = useMemo(() => {
    if (!nodes || current === null) return null;
    if (onOwn) return () => setAt(at - 1);
    const parent = nodes[current][PARENT];
    return parent === null ? null : () => go(parent);
  }, [nodes, current, onOwn, at, go]);
  const forward = useMemo(() => {
    if (!nodes || current === null) return null;
    if (onOwn) return at < ownHere.length - 1 ? () => setAt(at + 1) : null;
    const next = nodes[current][NEXT];
    if (next !== null) return () => go(next);
    return ownHere ? () => setAt(0) : null;
  }, [nodes, current, onOwn, ownHere, at, go]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (current === null || (e.target as HTMLElement)?.tagName === "INPUT") return;
      const step = e.key === "ArrowLeft" ? back : e.key === "ArrowRight" ? forward : undefined;
      if (step === undefined) return;
      e.preventDefault();
      step?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, back, forward]);

  // the page at the top of the screen: shown, and remembered for next time
  useEffect(() => {
    if (!doc) return;
    const onScroll = () => {
      // A third of the way down whatever is scrolling: the pane on a big
      // screen, the window on a phone.
      const box = wide ? pane.current?.getBoundingClientRect() : null;
      const line = box ? box.top + box.height / 3 : window.innerHeight / 3;
      let top = 1;
      for (const [n, el] of pageEls.current) {
        if (el.getBoundingClientRect().top < line) top = Math.max(top, n + 1);
      }
      setPage(top);
    };
    // Capture: a scroll inside the pane doesn't bubble up to the window.
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", onScroll, { capture: true });
  }, [doc, wide]);

  // Back to where the reader left off. Before the save below, and the save
  // waits for it: on opening, `page` is still 1, and saving that first wrote
  // over the page being restored, so every book reopened at the start.
  const restored = useRef(false);
  useEffect(() => {
    if (!doc) return;
    let saved = 1;
    try {
      saved = Number(localStorage.getItem(LAST_PAGE_KEY(id))) || 1;
    } catch {
      saved = 1;
    }
    if (saved > 1) {
      setPage(saved);
      requestAnimationFrame(() => pageEls.current.get(saved - 1)?.scrollIntoView({ block: "start" }));
    }
    restored.current = true;
  }, [doc, id]);

  useEffect(() => {
    if (!doc || !restored.current) return;
    try {
      localStorage.setItem(LAST_PAGE_KEY(id), String(page));
    } catch {
      // private window: nothing to remember with
    }
  }, [page, doc, id]);

  // From lg the reader fills the screen from wherever it starts (under the
  // app's bar, or under the trial's clock), so the window has nothing left
  // to scroll and the columns are the only scroll bars. Never below
  // MIN_FRAME: with something tall above, the window scrolls a little rather
  // than the board getting squeezed.
  // And it spans the window, less WIDE_MARGIN a side, rather than the page's
  // column (about 1,200px): a board as tall as the screen, the column beside
  // it and a readable page don't fit in that. Measured, not 100vw, which
  // counts the scroll bar and would scroll the page sideways.
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    if (!wide) {
      for (const prop of ["height", "width", "margin-left"]) el.style.removeProperty(prop);
      return;
    }
    const fit = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      el.style.height = `${Math.max(MIN_FRAME, window.innerHeight - top - FRAME_GAP)}px`;
      el.style.marginLeft = "0px";
      const left = el.getBoundingClientRect().left;
      el.style.width = `${document.documentElement.clientWidth - 2 * WIDE_MARGIN}px`;
      el.style.marginLeft = `${WIDE_MARGIN - left}px`;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [wide, doc, index]);

  const register = useCallback((n: number, el: HTMLElement | null) => {
    if (el) pageEls.current.set(n, el);
    else pageEls.current.delete(n);
  }, []);

  // Every page there will be, read yet or not: the whole book, or as far as
  // it is read (a guest's first 50 pages); a demo book, its index.
  const totalPages = doc && index ? Math.min(doc.numPages, Math.max(loadedPages, book?.pageCount ?? 0)) : 0;
  const reading = book !== null && isConverting(book) && loadedPages < totalPages;

  const jump = (value: string) => {
    const n = Number(value);
    if (n >= 1 && n <= totalPages) pageEls.current.get(n - 1)?.scrollIntoView({ block: "start" });
  };

  if (book?.status === "failed") return <p className="py-16 text-center text-sm text-red-600">{book.error || "This book could not be read."}</p>;
  if (error) return <p className="py-16 text-center text-sm text-red-600">{error}</p>;
  // Not on this device (another browser, or its storage cleared): ask for it.
  if (file === null && source.kind !== "public") return <OpenYourCopy book={{ title, sha256 }} onFile={setFile} />;
  if (!index || !doc || !file) {
    return (
      <div className="mx-auto mt-8 flex h-40 max-w-4xl flex-col items-center justify-center gap-2 rounded-xl bg-ink-card text-[14px] text-ink-faint">
        {fetching ? <p>Fetching the book, once: this browser keeps it for next time.</p> : <span className="h-4 w-24 animate-pulse rounded bg-ink-raised" />}
      </div>
    );
  }
  // Fewer pages in the index is a book read in part; more cannot be this file.
  if (doc.numPages < index.pages.length) {
    return <p className="py-16 text-center text-sm text-red-600">This copy of the book has a different number of pages from the one uploaded.</p>;
  }

  return (
    // From lg the book and the board each scroll in their own column, with a
    // scroll bar that stays in sight (not everyone thinks to scroll a pane);
    // the effect above sizes this to the screen.
    <div ref={frame} className={`mx-auto flex w-full max-w-[1240px] flex-col gap-4 lg:max-w-none lg:pb-0 ${sheet ? "pb-[75dvh]" : "pb-8"}`}>
      {above}
      <header className="flex flex-wrap items-center gap-3">
        <Link href={backHref} className="hidden rounded-pill border-2 border-accent px-3.5 py-1 text-[14px] font-[520] text-ink-text hover:bg-accent/10 sm:inline">
          Back
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-[18px] font-[520] text-ink-text sm:text-[22px]">{title}</h1>
        <label className="flex items-center gap-2 text-[13px] text-ink-faint">
          Page
          <input
            type="number"
            min={1}
            max={totalPages}
            key={page}
            defaultValue={page}
            onKeyDown={(e) => e.key === "Enter" && jump((e.target as HTMLInputElement).value)}
            onBlur={(e) => jump(e.target.value)}
            className="w-16 rounded-md border border-ink-line bg-ink-canvas px-2 py-1 text-ink-text"
          />
          <span className="tabular-nums">of {totalPages}</span>
        </label>
      </header>
      {reading && book && (
        <p aria-live="polite" className="rounded-lg bg-ink-card px-4 py-2 text-[13px] leading-relaxed text-ink-muted">
          Pages 1–{loadedPages} are ready: tap a move or a diagram. We&apos;re still reading the rest (page{" "}
          {Math.min(book.pagesDone + 1, book.pageCount)} of {book.pageCount}), and its moves light up as we go.
        </p>
      )}

      {/* From lg: the board, the column beside it (both from Panel), then the book. */}
      <div className="grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[auto_220px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:gap-4 xl:grid-cols-[auto_260px_minmax(0,1fr)]">
        <div ref={pane} data-book-pane className="lg:order-3 lg:h-full lg:overflow-y-scroll lg:rounded-xl lg:pr-2 lg:shown-scrollbar">
          <main className="mx-auto flex w-full max-w-[780px] flex-col gap-7 lg:py-1">
            {Array.from({ length: totalPages }, (_, i) => (
              <PdfPage
                key={i}
                doc={doc}
                number={i}
                page={index.pages[i] ?? null}
                guess={index.pages[Math.min(i, loadedPages - 1)]}
                current={current}
                onPick={pick}
                register={register}
              />
            ))}
            {totalPages < doc.numPages && partNote && (
              <aside className="rounded-xl bg-ink-card p-6 text-[15px] leading-relaxed text-ink-muted">{partNote}</aside>
            )}
          </main>
        </div>
        <Panel
          nodes={index.nodes}
          current={current}
          own={ownHere}
          at={at}
          go={go}
          play={play}
          selectOwn={setAt}
          back={back}
          forward={forward}
          open={sheet || wide}
          onClose={closeSheet}
        />
      </div>
    </div>
  );
}
