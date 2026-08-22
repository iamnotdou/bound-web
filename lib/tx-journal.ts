/**
 * What this browser has in flight, written down before it is sent.
 *
 * This exists to fix a specific lie. `/api/tx/submit` polls for thirty seconds
 * and then throws, and the UI renders that as "the network rejected the
 * transaction" — for a transaction that, more often than not, landed a few
 * seconds later. The user is told their deposit failed while their money is
 * gone. Writing the hash down *before* submitting means the browser can go and
 * ask the chain what actually happened, instead of reporting a timeout as a
 * verdict.
 *
 * `localJournal` is the implementation for today. The interface exists so the
 * database version is a second implementation rather than a rewrite of every
 * call site — nothing in the app touches `localStorage` directly.
 */
import type { AppAction } from "@/lib/tx";

export interface JournalEntry {
  hash: string;
  action: AppAction;
  certId: number | null;
  address: string;
  submittedAtUnix: number;
  status: "pending" | "success" | "failed";
}

export interface TxJournal {
  put(entry: Omit<JournalEntry, "status">): void;
  pending(): JournalEntry[];
  settle(hash: string, status: "success" | "failed"): void;
  forget(hash: string): void;
  /**
   * Everything the journal holds, newest first.
   *
   * Not in SPEC.md §4.6's interface, added because the banner has to show what
   * *resolved* as well as what is in flight — "your deposit landed" is the
   * whole point of keeping the record, and `pending()` by definition cannot
   * return it.
   */
  entries(): JournalEntry[];
}

const KEY = "bound:tx-journal";

/** Entries older than this are dropped on read; a week-old hash helps nobody. */
const MAX_AGE_SECONDS = 24 * 60 * 60;
const MAX_ENTRIES = 50;

/** The slice of `Storage` this needs, so a test can pass a plain object. */
export interface JournalStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function isEntry(value: unknown): value is JournalEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.hash === "string" &&
    typeof entry.action === "string" &&
    typeof entry.address === "string" &&
    typeof entry.submittedAtUnix === "number" &&
    (entry.certId === null || typeof entry.certId === "number") &&
    (entry.status === "pending" ||
      entry.status === "success" ||
      entry.status === "failed")
  );
}

export function createJournal(
  storage: JournalStorage,
  now: () => number = () => Math.floor(Date.now() / 1000),
): TxJournal {
  function read(): JournalEntry[] {
    let raw: string | null;
    try {
      raw = storage.getItem(KEY);
    } catch {
      // Private browsing, a blocked origin, a quota error — none of which is
      // worth taking a page down for.
      return [];
    }
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const cutoff = now() - MAX_AGE_SECONDS;
      return parsed
        .filter(isEntry)
        .filter((entry) => entry.submittedAtUnix >= cutoff);
    } catch {
      return [];
    }
  }

  function write(entries: JournalEntry[]): void {
    try {
      storage.setItem(KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
    } catch {
      /* see read() */
    }
  }

  return {
    put(entry) {
      const entries = read().filter((existing) => existing.hash !== entry.hash);
      write([{ ...entry, status: "pending" }, ...entries]);
    },
    pending() {
      return read().filter((entry) => entry.status === "pending");
    },
    settle(hash, status) {
      write(
        read().map((entry) =>
          entry.hash === hash ? { ...entry, status } : entry,
        ),
      );
    },
    forget(hash) {
      write(read().filter((entry) => entry.hash !== hash));
    },
    entries() {
      return read().sort((a, b) => b.submittedAtUnix - a.submittedAtUnix);
    },
  };
}

/** A journal that remembers nothing, for a server render or a blocked origin. */
function nullStorage(): JournalStorage {
  return { getItem: () => null, setItem: () => undefined };
}

let cached: TxJournal | null = null;

/**
 * Anything watching the journal.
 *
 * The write path and the banner that displays it are different components with
 * their own hook instances, so a write in one has to reach the other. This is
 * deliberately not part of `TxJournal` — a database-backed journal would push
 * changes some other way, and the interface should not carry the local
 * implementation's plumbing.
 */
const listeners = new Set<() => void>();

export function subscribeToJournal(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(): void {
  for (const listener of [...listeners]) listener();
}

/**
 * The browser's journal.
 *
 * Resolved lazily rather than at module scope: this module is imported by
 * Client Components that also render on the server, where `localStorage` does
 * not exist. A server render gets an empty journal, which is correct — the
 * server genuinely does not know what this browser sent.
 */
export const localJournal: TxJournal = {
  put: (entry) => {
    resolve().put(entry);
    notify();
  },
  pending: () => resolve().pending(),
  settle: (hash, status) => {
    resolve().settle(hash, status);
    notify();
  },
  forget: (hash) => {
    resolve().forget(hash);
    notify();
  },
  entries: () => resolve().entries(),
};

function resolve(): TxJournal {
  if (cached) return cached;
  const storage =
    typeof globalThis !== "undefined" &&
    "localStorage" in globalThis &&
    globalThis.localStorage
      ? (globalThis.localStorage as JournalStorage)
      : nullStorage();
  cached = createJournal(storage);
  return cached;
}

// export const serverJournal: TxJournal;   // later, when the DB lands
