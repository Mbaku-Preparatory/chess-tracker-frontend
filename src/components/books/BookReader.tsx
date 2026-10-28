"use client";

/**
 * Reading a book: the owner's own PDF, page by page, with every move and
 * diagram the server found lit up over it. Tap one and the board shows that
 * position; ← and → step through the line it belongs to. The board is also
 * playable: any legal move from the position starts the reader's own line,
 * kept beside the book's, and ← steps back into the book.
 *
 * On a desktop the board sits beside the book. On a phone or tablet the book
 * has the whole screen, and the board slides up from the bottom when a move
 * is tapped; swiping it down, ✕, or the phone's back button puts it away.
 *
 * The owner's PDF comes from this device (lib/bookFiles.ts), never from the
 * server, which kept only the index (lib/books.ts, ReaderIndex). A demo book
 * (lib/publicBook.ts) is the one exception: the server serves both, and the
 * PDF is kept on the device after the first visit. pdf.js draws the pages,
 * only those near the screen, and lets go of the rest.
 */

import { Chess } from "chess.js";
import Link from "next/link";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";

import { EnginePanel } from "@/components/analysis/EnginePanel";
import { useEngine } from "@/hooks/useEngine";
import { DEPTHS, useAnalysisPrefs } from "@/lib/analysisPrefs";
import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import { bookFile, keepBookFile, sha256Of } from "@/lib/bookFiles";
import type { Book, ReaderIndex } from "@/lib/books";
import { bookIndexUrl, bookPdfUrl } from "@/lib/publicBook";

/** Where a book's index and PDF come from: the owner's account and device,
 * or the public routes of a demo book. */
export type BookSource = { kind: "own"; book: Book } | { kind: "public"; slug: string; title: string; sha256: string };

async function publicFetch<T>(url: string, read: (r: Response) => Promise<T>): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(response.status === 404 ? "This book is no longer available." : "The book could not be loaded. Try again in a moment.");
  return read(response);
}

type Node = ReaderIndex["nodes"][number];

const FEN = 0, SAN = 1, PARENT = 2, NEXT = 3;
const LAST_PAGE_KEY = (id: string) => `book-reader-page:${id}`;
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

function legalTargets(fen: string, from: string): string[] {
  try {
    return new Chess(fen).moves({ square: from as never, verbose: true }).map((m) => m.to);
  } catch {
    return [];
  }
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

function OpenYourCopy({ book, onFile }: { book: Book; onFile: (file: Blob) => void }) {
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
  current,
  onPick,
  register,
}: {
  doc: PDFDocumentProxy;
  number: number;
  page: ReaderIndex["pages"][number];
  current: number | null;
  onPick: (node: number) => void;
  register: (number: number, el: HTMLElement | null) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [near, setNear] = useState(false);

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
  }, [near, doc, number]);

  return (
    <div
      ref={(el) => {
        box.current = el;
        register(number, el);
      }}
      data-page={number + 1}
      className="relative w-full bg-white shadow-sm"
      style={{ aspectRatio: `${page.w} / ${page.h}` }}
    >
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" aria-label={`Page ${number + 1}`} />
      {page.hot.map(([x0, y0, x1, y1, node, kind], i) => {
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
              left: `${((x0 - pad) / page.w) * 100}%`,
              top: `${((y0 - pad) / page.h) * 100}%`,
              width: `${((x1 - x0 + 2 * pad) / page.w) * 100}%`,
              height: `${((y1 - y0 + 2 * pad) / page.h) * 100}%`,
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
  play: (from: string, to: string) => boolean;
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
  // A tapped piece, waiting for its square. Tied to the position it was
  // tapped in, so stepping elsewhere forgets it.
  const [tapped, setTapped] = useState<{ fen: string; square: string } | null>(null);
  const selected = tapped?.fen === fen ? tapped.square : null;
  // swiping the sheet down puts it away
  const [drag, setDrag] = useState(0);
  const dragStart = useRef<number | null>(null);

  useEffect(() => {
    listRef.current?.querySelector("[data-on]")?.scrollIntoView({ block: "nearest" });
  }, [current, at]);

  const onSquareClick = (square: string) => {
    if (current === null) return;
    if (selected === square) return setTapped(null);
    if (selected && legalTargets(fen, selected).includes(square)) {
      play(selected, square);
      return setTapped(null);
    }
    setTapped(legalTargets(fen, square).length > 0 ? { fen, square } : null);
  };

  const squareStyles: Record<string, React.CSSProperties> = moved
    ? { [moved.from]: { background: "rgba(255, 221, 0, 0.38)" }, [moved.to]: { background: "rgba(255, 221, 0, 0.38)" } }
    : {};
  if (selected) {
    squareStyles[selected] = { backgroundColor: "rgba(246,195,68,0.8)" };
    for (const sq of legalTargets(fen, selected)) {
      squareStyles[sq] = { background: "radial-gradient(circle, rgba(20,20,20,0.30) 22%, transparent 24%)" };
    }
  }

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
      } lg:pointer-events-auto lg:sticky lg:top-20 lg:z-auto lg:max-h-none lg:translate-y-0 lg:gap-3 lg:overflow-visible lg:rounded-xl lg:p-4 lg:shadow-none`}
    >
      {/* the handle: where a swipe down starts, on a phone */}
      <div aria-hidden="true" className="mx-auto h-1.5 w-10 shrink-0 rounded-full bg-ink-line lg:hidden" />
      <div onTouchStart={keep} onTouchMove={keep} onTouchEnd={keep} className="mx-auto w-full max-w-[min(100%,40dvh)] lg:max-w-none">
        <Chessboard
          options={{
            position: fen,
            // Play your own moves: the book is untouched, and a move that is
            // not its next one opens the reader's own line instead.
            allowDragging: current !== null,
            onPieceDrop: ({ sourceSquare, targetSquare }) => {
              setTapped(null);
              return targetSquare ? play(sourceSquare, targetSquare) : false;
            },
            onSquareClick: ({ square }) => onSquareClick(square),
            squareStyles,
            arrows: [],
            boardStyle: { borderRadius: "6px" },
            darkSquareStyle: { backgroundColor: "#4a7c59" },
            lightSquareStyle: { backgroundColor: "#f0d9b5" },
            animationDurationInMs: 150,
          }}
        />
      </div>
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
        <div ref={listRef} className="max-h-24 overflow-y-auto border-t border-ink-line pt-2 text-[14px] leading-7 lg:max-h-48">
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

export function BookReader({ source, backHref = "/books" }: { source: BookSource; backHref?: string }) {
  const title = source.kind === "own" ? source.book.title : source.title;
  const sha256 = source.kind === "own" ? source.book.sha256 : source.sha256;
  // Primitives, so a parent re-rendering with a fresh `source` object does
  // not fetch the book again.
  const publicId = source.kind === "own" ? source.book.publicId : null;
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

  useEffect(() => {
    let cancelled = false;
    const index = publicId !== null ? api.getBookReader(publicId) : publicFetch(bookIndexUrl(slug as string), (r) => r.json());
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
  }, [publicId, slug, sha256]);

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
    (from: string, to: string) => {
      if (!nodes || current === null) return false;
      let m;
      try {
        m = new Chess(onOwn ? ownHere[at].fen : nodes[current][FEN]).move({ from, to, promotion: "q" });
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
      let top = 1;
      for (const [n, el] of pageEls.current) {
        if (el.getBoundingClientRect().top < window.innerHeight / 3) top = Math.max(top, n + 1);
      }
      setPage(top);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [doc]);

  useEffect(() => {
    try {
      if (doc) localStorage.setItem(LAST_PAGE_KEY(id), String(page));
    } catch {
      // private window: nothing to remember with
    }
  }, [page, doc, id]);

  // back to where the reader left off
  useEffect(() => {
    if (!doc) return;
    let saved = 1;
    try {
      saved = Number(localStorage.getItem(LAST_PAGE_KEY(id))) || 1;
    } catch {
      saved = 1;
    }
    if (saved > 1) requestAnimationFrame(() => pageEls.current.get(saved - 1)?.scrollIntoView({ block: "start" }));
  }, [doc, id]);

  const register = useCallback((n: number, el: HTMLElement | null) => {
    if (el) pageEls.current.set(n, el);
    else pageEls.current.delete(n);
  }, []);

  const jump = (value: string) => {
    const n = Number(value);
    if (n >= 1 && index && n <= index.pages.length) pageEls.current.get(n - 1)?.scrollIntoView({ block: "start" });
  };

  if (error) return <p className="py-16 text-center text-sm text-red-600">{error}</p>;
  if (file === null && source.kind === "own") return <OpenYourCopy book={source.book} onFile={setFile} />;
  if (!index || !doc || !file) {
    return (
      <div className="mx-auto mt-8 flex h-40 max-w-4xl flex-col items-center justify-center gap-2 rounded-xl bg-ink-card text-[14px] text-ink-faint">
        {fetching ? <p>Fetching the book, once: this browser keeps it for next time.</p> : <span className="h-4 w-24 animate-pulse rounded bg-ink-raised" />}
      </div>
    );
  }
  if (doc.numPages !== index.pages.length) {
    return <p className="py-16 text-center text-sm text-red-600">This copy of the book has a different number of pages from the one uploaded.</p>;
  }

  return (
    <div className={`mx-auto flex w-full max-w-[1240px] flex-col gap-4 lg:pb-8 ${sheet ? "pb-[75dvh]" : "pb-8"}`}>
      <header className="flex flex-wrap items-center gap-3">
        <Link href={backHref} className="rounded-pill border-2 border-accent px-3.5 py-1 text-[14px] font-[520] text-ink-text hover:bg-accent/10">
          Back
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-[18px] font-[520] text-ink-text sm:text-[22px]">{title}</h1>
        <label className="flex items-center gap-2 text-[13px] text-ink-faint">
          Page
          <input
            type="number"
            min={1}
            max={index.pages.length}
            key={page}
            defaultValue={page}
            onKeyDown={(e) => e.key === "Enter" && jump((e.target as HTMLInputElement).value)}
            onBlur={(e) => jump(e.target.value)}
            className="w-16 rounded-md border border-ink-line bg-ink-canvas px-2 py-1 text-ink-text"
          />
          <span className="tabular-nums">of {index.pages.length}</span>
        </label>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <main className="mx-auto flex w-full max-w-[780px] flex-col gap-7">
          {index.pages.map((p, i) => (
            <PdfPage key={i} doc={doc} number={i} page={p} current={current} onPick={pick} register={register} />
          ))}
        </main>
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
