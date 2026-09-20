import type { CertStatusTag } from "@/lib/bound";
import { cn } from "@/lib/utils";

/**
 * What each status is called on screen.
 *
 * `Pending` is the contract's word and it says the wrong thing to a reader:
 * it sounds like a queue that is moving. What the state actually means is that
 * no auditor has attested, which may stay true forever — nobody is obliged to
 * pick a certificate up. The label says that instead.
 *
 * Exported so the marketplace's filter tabs and this badge cannot drift into
 * calling the same state two different things.
 */
export const STATUS_LABELS: Record<CertStatusTag, string> = {
  Verified: "Verified",
  Pending: "Awaiting auditor",
  Invalid: "Invalid",
};

const STYLES: Record<CertStatusTag, string> = {
  Verified: "bg-primary/10 text-primary ring-primary/25",
  Pending: "bg-foreground/5 text-muted-foreground ring-foreground/10",
  Invalid: "bg-destructive/10 text-destructive ring-destructive/25",
};

export function StatusBadge({
  status,
  expired = false,
  className,
}: {
  status: CertStatusTag;
  expired?: boolean;
  className?: string;
}) {
  const name = STATUS_LABELS[status];
  const label = expired ? `${name} · expired` : name;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1",
        expired
          ? "bg-foreground/5 text-muted-foreground ring-foreground/10 line-through decoration-1"
          : STYLES[status],
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          expired ? "bg-muted-foreground" : "bg-current",
        )}
      />
      {label}
    </span>
  );
}
