/**
 * The owner's own copy of a book, kept in this browser (IndexedDB).
 *
 * The server never keeps a reader book's PDF: it converts it, keeps an index
 * of where each move and diagram sits, and deletes the file. The reader shows
 * that index over this copy. Files are stored by their SHA-256, which the
 * server also recorded at upload, so the reader knows it has the same file.
 */

const DB = "chess-preparatory-books";
const STORE = "pdfs";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => {
          db.close();
          resolve(req.result as T);
        };
        tx.onerror = tx.onabort = () => {
          db.close();
          reject(tx.error ?? req.error);
        };
      }),
  );
}

export async function sha256Of(file: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Keep a copy. Never throws: a private window or a full disk just means the
 * reader will ask for the file again. */
export async function keepBookFile(sha256: string, file: Blob): Promise<void> {
  try {
    await run("readwrite", (s) => s.put(file, sha256));
  } catch {
    // nothing to do: see above
  }
}

export async function bookFile(sha256: string): Promise<Blob | null> {
  try {
    return (await run<Blob | undefined>("readonly", (s) => s.get(sha256))) ?? null;
  } catch {
    return null;
  }
}

export async function forgetBookFile(sha256: string): Promise<void> {
  try {
    await run("readwrite", (s) => s.delete(sha256));
  } catch {
    // nothing to do
  }
}
