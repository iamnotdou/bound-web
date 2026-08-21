import type { CertStatusTag } from "@/lib/bound";
import { cn } from "@/lib/utils";

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
  const label = expired ? `${status} · expired` : status;
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
