import Link from "next/link";
import { ArrowLeft, Archive } from "lucide-react";

/**
 * Defect L2, made legible.
 *
 * Soroban reclaims persistent ledger entries whose rent lapses. The data is not
 * destroyed — it can be restored by anyone willing to pay for it — but until
 * somebody does, nothing can read the certificate. That is a different fact
 * from "no such certificate", and rendering it as a 404 would quietly tell a
 * counterparty that a bond they were shown never existed.
 *
 * This explains the state. It does not build the `RestoreFootprint`
 * transaction that would undo it; that was excluded from this MVP on purpose,
 * and pretending otherwise here would be its own small lie.
 */
export function ArchivedNotice({
  certId,
  detail,
}: {
  certId: number;
  /** What was unreadable, when only part of the record was. */
  detail?: string;
}) {
  return (
    <div className="ring-foreground/10 bg-muted/40 rounded-xl p-5 ring-1">
      <h2 className="text-foreground flex items-center gap-2 text-sm font-semibold">
        <Archive aria-hidden className="size-4" />
        Part of certificate #{certId} has been archived
      </h2>
      <p className="text-muted-foreground mt-2 text-sm text-balance">
        {detail ??
          "The registry counts this id among the certificates it has issued, but the record did not come back."}{" "}
        On Soroban that means the ledger entry&apos;s rent lapsed and the entry
        was reclaimed. The data still exists and can be restored, but nothing
        can read it until somebody pays to bring it back.
      </p>
      <p className="text-muted-foreground mt-2 text-sm text-balance">
        Every certificate published through this app is on the same clock. This
        app detects the state and says so; it does not build the restore
        transaction.
      </p>
      <Link
        href="/app"
        className="text-primary mt-3 inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />
        All bonded agents
      </Link>
    </div>
  );
}
