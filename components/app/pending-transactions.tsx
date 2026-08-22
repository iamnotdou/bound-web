"use client";

/**
 * What this browser has sent, and what became of it.
 *
 * Restored across reloads, because the interesting case is exactly the one
 * where the page went away mid-transaction. A hash written down before submit
 * and re-read afterwards is the difference between "we do not know yet" and
 * the app's old answer, which was to call a thirty-second timeout a rejection.
 *
 * Nothing here is a claim about what a transaction *did* — only what the chain
 * says its status is, with a link to check independently.
 */
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { useTxJournal } from "@/lib/use-tx-journal";
import type { JournalEntry } from "@/lib/tx-journal";
import { cn } from "@/lib/utils";

const LABEL: Record<string, string> = {
  publish: "Publish a certificate",
  deposit: "Fund a reserve",
  trustline: "Open a USDC trustline",
  stake: "Stake as an auditor",
  attest: "Attest a certificate",
  challenge: "File a challenge",
  "deposit-fee": "Escrow an audit fee",
  pay: "Send USDC",
};

export function PendingTransactions() {
  const { entries, pending, forget, reconciling } = useTxJournal();

  if (entries.length === 0) return null;

  return (
    <section
      aria-labelledby="journal-heading"
      className="ring-foreground/6.5 bg-card mx-auto mt-6 w-full max-w-6xl rounded-xl p-5 shadow ring-1"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2
          id="journal-heading"
          className="text-foreground text-sm font-semibold"
        >
          Transactions from this browser
        </h2>
        <p className="text-muted-foreground text-xs">
          {pending.length > 0
            ? `${pending.length} still resolving${reconciling ? " — asking the chain" : ""}`
            : "all resolved"}
        </p>
      </div>

      <ul className="divide-border mt-3 divide-y">
        {entries.map((entry) => (
          <li
            key={entry.hash}
            className="flex flex-wrap items-center justify-between gap-3 py-2.5"
          >
            <span className="flex min-w-0 items-center gap-2">
              <StatusIcon status={entry.status} />
              <span className="min-w-0">
                <span className="text-foreground block text-sm">
                  {LABEL[entry.action] ?? entry.action}
                  {entry.certId !== null ? ` · #${entry.certId}` : ""}
                </span>
                <span className="text-muted-foreground font-address block truncate text-xs">
                  {entry.hash}
                </span>
              </span>
            </span>
            <span className="flex items-center gap-3">
              <span
                className={cn(
                  "text-xs",
                  entry.status === "failed"
                    ? "text-destructive"
                    : entry.status === "success"
                      ? "text-primary"
                      : "text-muted-foreground",
                )}
              >
                {entry.status === "pending"
                  ? "not resolved yet"
                  : entry.status === "success"
                    ? "landed"
                    : "the chain rejected it"}
              </span>
              <button
                type="button"
                onClick={() => forget(entry.hash)}
                className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
              >
                Dismiss
              </button>
            </span>
          </li>
        ))}
      </ul>

      {pending.length > 0 ? (
        <p className="text-muted-foreground mt-3 text-xs text-balance">
          &ldquo;Not resolved yet&rdquo; means the node has not reported an
          outcome — it is not a failure. Each one is re-read against the chain
          whenever this page loads.
        </p>
      ) : null}
    </section>
  );
}

function StatusIcon({ status }: { status: JournalEntry["status"] }) {
  if (status === "success") {
    return (
      <CheckCircle2 aria-hidden className="text-primary size-4 shrink-0" />
    );
  }
  if (status === "failed") {
    return <XCircle aria-hidden className="text-destructive size-4 shrink-0" />;
  }
  return (
    <Clock aria-hidden className="text-muted-foreground size-4 shrink-0" />
  );
}
