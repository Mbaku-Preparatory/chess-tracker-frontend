"use client";

/**
 * Reading a book: the owner's own PDF, page by page, with every move and
 * diagram the server found lit up over it. Tap one and the board shows that
 * position; ← and → step through the line it belongs to.
 *
 * On a desktop the board sits beside the book. On a phone or tablet the book
 * has the whole screen, and the board slides up from the bottom when a move
 * is tapped; swiping it down, ✕, or the phone's back button puts it away.
 *
 * The PDF comes from this device (lib/bookFiles.ts), never from the server,
 * which kept only the index (lib/books.ts, ReaderIndex). pdf.js draws the
 * pages, only those near the screen, and lets go of the rest.
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

type Node = ReaderIndex["nodes"][number];

const FEN = 0, SAN = 1, PARENT = 2, NEXT = 3;
const LAST_PAGE_KEY = (id: string) => `book-reader-page:${id}`;

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
  go,
  open,
  onClose,
}: {
  nodes: Node[];
  current: number | null;
  go: (n: number) => void;
  /** below lg: whether the sheet is up (from lg the panel is always there) */
  open: boolean;
  onClose: () => void;
}) {
  const fen = current === null ? "8/8/8/8/8/8/8/8 w - - 0 1" : nodes[current][FEN];
  const [prefs, setPrefs] = useAnalysisPrefs();
  const engine = useEngine(fen, { enabled: prefs.engine && current !== null, depth: DEPTHS[prefs.depth].depth, capMs: DEPTHS[prefs.depth].capMs });
  const line = useMemo(() => (current === null ? [] : lineThrough(nodes, current)), [nodes, current]);
  const moved = current === null ? null : lastMove(nodes, current);
  const toMove = fen.split(" ")[1] === "w" ? "White" : "Black";
  const prev = current === null ? null : nodes[current][PARENT];
  const next = current === null ? null : nodes[current][NEXT];
  const listRef = useRef<HTMLDivElement>(null);
  // swiping the sheet down puts it away
  const [drag, setDrag] = useState(0);
  const dragStart = useRef<number | null>(null);

  useEffect(() => {
    listRef.current?.querySelector("[data-on]")?.scrollIntoView({ block: "nearest" });
  }, [current]);

  const squareStyles: Record<string, React.CSSProperties> = moved
    ? { [moved.from]: { background: "rgba(255, 221, 0, 0.38)" }, [moved.to]: { background: "rgba(255, 221, 0, 0.38)" } }
    : {};

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
      <div className="mx-auto w-full max-w-[min(100%,40dvh)] lg:max-w-none">
        <Chessboard
          options={{
            position: fen,
            allowDragging: false,
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
            : nodes[current][SAN]
              ? `${moveLabel(nodes, current)} · ${toMove} to move`
              : `${toMove} to move`}
        </p>
        <div className="flex shrink-0 gap-2">
          <button type="button" aria-label="Previous move" disabled={prev === null} onClick={() => prev !== null && go(prev)} className={button}>
            ←
          </button>
          <button type="button" aria-label="Next move" disabled={next === null} onClick={() => next !== null && go(next)} className={button}>
            →
          </button>
          <button type="button" aria-label="Close the board" onClick={onClose} className={`${button} lg:hidden`}>
            ✕
          </button>
        </div>
      </div>
      {line.length > 1 && (
        <div ref={listRef} className="max-h-16 overflow-y-auto border-t border-ink-line pt-2 text-[14px] leading-7 lg:max-h-48">
          {line.map((x, i) => {
            if (!nodes[x][SAN]) return null;
            const parent = nodes[nodes[x][PARENT] as number][FEN].split(" ");
            const numbered = parent[1] === "w" || i === 1 || !nodes[line[i - 1]][SAN];
            return (
              <span key={x}>
                {numbered && <span className="ml-1 text-ink-faint">{parent[5]}{parent[1] === "w" ? "." : "..."}</span>}
                <button
                  type="button"
                  data-on={x === current ? "" : undefined}
                  onClick={() => go(x)}
                  className={`rounded px-1 ${x === current ? "bg-accent text-accent-on" : "text-ink-text hover:bg-accent/15"}`}
                >
                  {nodes[x][SAN]}
                </button>{" "}
              </span>
            );
          })}
        </div>
      )}
      <div className="hidden lg:block">
        <EnginePanel prefs={prefs} setPrefs={setPrefs} engine={engine} fen={fen} />
      </div>
      <p className="hidden text-[13px] text-ink-faint lg:block">
        Shaded moves are the game; underlined ones are variations in the text. The arrow keys step through the line.
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

export function BookReader({ book }: { book: Book }) {
  const [index, setIndex] = useState<ReaderIndex | null>(null);
  const [file, setFile] = useState<Blob | null | undefined>(undefined);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<number | null>(null);
  const [sheet, setSheet] = useState(false);
  const wide = useWide();
  const [page, setPage] = useState(1);
  const pageEls = useRef(new Map<number, HTMLElement>());

  useEffect(() => {
    let cancelled = false;
    api.getBookReader(book.publicId).then(
      (i) => !cancelled && setIndex(i),
      (err) => !cancelled && setError(userMessage(err)),
    );
    bookFile(book.sha256).then((f) => !cancelled && setFile(f));
    return () => {
      cancelled = true;
    };
  }, [book.publicId, book.sha256]);

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
      openSheet();
      reveal(n, false);
    },
    [openSheet, reveal],
  );

  /** A step through the line, from the panel or the keyboard. */
  const go = useCallback(
    (n: number) => {
      setCurrent(n);
      reveal(n, true);
    },
    [reveal],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!index || current === null || (e.target as HTMLElement)?.tagName === "INPUT") return;
      const target = e.key === "ArrowLeft" ? index.nodes[current][PARENT] : e.key === "ArrowRight" ? index.nodes[current][NEXT] : undefined;
      if (target === undefined) return;
      e.preventDefault();
      if (target !== null) go(target);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, current, go]);

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
      if (doc) localStorage.setItem(LAST_PAGE_KEY(book.publicId), String(page));
    } catch {
      // private window: nothing to remember with
    }
  }, [page, doc, book.publicId]);

  // back to where the reader left off
  useEffect(() => {
    if (!doc) return;
    let saved = 1;
    try {
      saved = Number(localStorage.getItem(LAST_PAGE_KEY(book.publicId))) || 1;
    } catch {
      saved = 1;
    }
    if (saved > 1) requestAnimationFrame(() => pageEls.current.get(saved - 1)?.scrollIntoView({ block: "start" }));
  }, [doc, book.publicId]);

  const register = useCallback((n: number, el: HTMLElement | null) => {
    if (el) pageEls.current.set(n, el);
    else pageEls.current.delete(n);
  }, []);

  const jump = (value: string) => {
    const n = Number(value);
    if (n >= 1 && index && n <= index.pages.length) pageEls.current.get(n - 1)?.scrollIntoView({ block: "start" });
  };

  if (error) return <p className="py-16 text-center text-sm text-red-600">{error}</p>;
  if (file === null) return <OpenYourCopy book={book} onFile={setFile} />;
  if (!index || !doc || file === undefined) {
    return <div className="mx-auto mt-8 h-40 max-w-4xl animate-pulse rounded-xl bg-ink-card" />;
  }
  if (doc.numPages !== index.pages.length) {
    return <p className="py-16 text-center text-sm text-red-600">This copy of the book has a different number of pages from the one uploaded.</p>;
  }

  return (
    <div className={`mx-auto flex w-full max-w-[1240px] flex-col gap-4 lg:pb-8 ${sheet ? "pb-[75dvh]" : "pb-8"}`}>
      <header className="flex flex-wrap items-center gap-3">
        <Link href="/books" className="rounded-pill border-2 border-accent px-3.5 py-1 text-[14px] font-[520] text-ink-text hover:bg-accent/10">
          Back
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-[18px] font-[520] text-ink-text sm:text-[22px]">{book.title}</h1>
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
        <Panel nodes={index.nodes} current={current} go={go} open={sheet || wide} onClose={closeSheet} />
      </div>
    </div>
  );
}
