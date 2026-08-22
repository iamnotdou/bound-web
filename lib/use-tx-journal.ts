"use client";

/**
 * The journal, reconciled against the chain.
 *
 * On mount — including after a reload, a crash, or a laptop lid closing
 * mid-deposit — every hash still marked pending is re-read through
 * `/api/tx/[hash]`. That is what turns "the network rejected the transaction"
 * back into what actually happened: the submit route stops polling at thirty
 * seconds, and a transaction that lands at thirty-one is not a failure.
 *
 * Forms call this hook. Nothing in the app touches `localStorage` itself.
 */
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  localJournal,
  subscribeToJournal,
  type JournalEntry,
} from "@/lib/tx-journal";
import type { AppAction } from "@/lib/tx";

export interface TxJournalView {
  entries: JournalEntry[];
  pending: JournalEntry[];
  /** Write the hash down. Call this before submitting, not after. */
  record: (entry: {
    hash: string;
    action: AppAction;
    certId: number | null;
    address: string;
  }) => void;
  settle: (hash: string, status: "success" | "failed") => void;
  forget: (hash: string) => void;
  /** True while pending hashes are being re-read against the chain. */
  reconciling: boolean;
}

async function readStatus(
  hash: string,
): Promise<"success" | "failed" | "pending"> {
  try {
    const response = await fetch(`/api/tx/${hash}`, { cache: "no-store" });
    if (!response.ok) return "pending";
    const body = (await response.json()) as { status?: string };
    if (body.status === "SUCCESS") return "success";
    if (body.status === "FAILED") return "failed";
    // NOT_FOUND: the node has not seen it yet, or never will. Either way it is
    // not evidence of failure, so the entry stays pending and gets asked again.
    return "pending";
  } catch {
    return "pending";
  }
}

export function useTxJournal(): TxJournalView {
  const router = useRouter();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [reconciling, setReconciling] = useState(false);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  // A write from anywhere in the app — a form submitting, another panel
  // settling — has to reach this view too.
  useEffect(() => subscribeToJournal(reload), [reload]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const current = localJournal.entries();
      if (!cancelled) setEntries(current);

      const outstanding = current.filter((e) => e.status === "pending");
      if (outstanding.length === 0) return;

      if (!cancelled) setReconciling(true);
      let anySettled = false;
      for (const entry of outstanding) {
        const status = await readStatus(entry.hash);
        if (cancelled) return;
        if (status !== "pending") {
          localJournal.settle(entry.hash, status);
          anySettled = true;
        }
      }
      if (cancelled) return;
      setEntries(localJournal.entries());
      setReconciling(false);
      // Something that was in flight has landed, so the cached server render
      // of the affected certificate is now stale. Re-read it once; this is
      // what "auto-refresh after an action lands" is, rather than a poll.
      if (anySettled) router.refresh();
    })();

    return () => {
      cancelled = true;
    };
  }, [nonce, router]);

  const record = useCallback<TxJournalView["record"]>(
    (entry) => {
      localJournal.put({
        ...entry,
        submittedAtUnix: Math.floor(Date.now() / 1000),
      });
      reload();
    },
    [reload],
  );

  const settle = useCallback<TxJournalView["settle"]>(
    (hash, status) => {
      localJournal.settle(hash, status);
      reload();
    },
    [reload],
  );

  const forget = useCallback<TxJournalView["forget"]>(
    (hash) => {
      localJournal.forget(hash);
      reload();
    },
    [reload],
  );

  return {
    entries,
    pending: entries.filter((entry) => entry.status === "pending"),
    record,
    settle,
    forget,
    reconciling,
  };
}
