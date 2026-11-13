import { ExternalLink } from "lucide-react";
import { explorerAccount, explorerTx } from "@/lib/near/format";
import { cn } from "@/lib/utils";

/** Building blocks for the NEAR pages. Server-safe; no hooks. */

export function Panel({
  id,
  title,
  icon,
  children,
  className,
}: {
  id: string;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "ring-foreground/6.5 bg-card mt-8 min-w-0 rounded-xl p-5 shadow ring-1 sm:p-6",
        className,
      )}
    >
      <h2
        id={id}
        className="text-foreground flex items-center gap-2 text-lg font-semibold"
      >
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Row({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="text-muted-foreground shrink-0 text-sm">{label}</dt>
      <dd className="text-foreground min-w-0 text-sm [overflow-wrap:anywhere] sm:text-right">
        {children}
      </dd>
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  Verified: "bg-primary/10 text-primary ring-primary/25",
  Invalid: "bg-destructive/10 text-destructive ring-destructive/25",
  Challenged:
    "bg-amber-500/10 text-amber-600 ring-amber-500/25 dark:text-amber-400",
};

export function NearStatusBadge({
  status,
  halted = false,
}: {
  status: string;
  halted?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1",
        STATUS_STYLE[status] ??
          "bg-foreground/5 text-muted-foreground ring-foreground/10",
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {status}
      {halted ? " · halted" : ""}
    </span>
  );
}

export function AccountLink({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  return (
    <a
      href={explorerAccount(id)}
      target="_blank"
      rel="noreferrer"
      title={`${id} on NearBlocks`}
      className={cn(
        "font-address hover:text-primary break-all text-sm underline decoration-dotted underline-offset-2",
        className,
      )}
    >
      {id}
    </a>
  );
}

export function TxLink({ hash, edge = 8 }: { hash: string; edge?: number }) {
  const short =
    hash.length > edge * 2 + 1
      ? `${hash.slice(0, edge)}...${hash.slice(-4)}`
      : hash;
  return (
    <a
      href={explorerTx(hash)}
      target="_blank"
      rel="noreferrer"
      title={hash}
      className="font-address hover:text-primary inline-flex items-center gap-1 text-xs underline decoration-dotted underline-offset-2"
    >
      {short}
      <ExternalLink aria-hidden className="size-3" />
    </a>
  );
}

export function Unreadable({ what }: { what: string }) {
  return (
    <p className="text-muted-foreground mt-2 text-sm text-balance">
      {what} could not be read from testnet just now. That is a failure to get
      an answer, not an answer; reload in a few seconds.
    </p>
  );
}

export function Amount({
  value,
  unit = "mUSDC",
}: {
  value: string;
  unit?: string;
}) {
  return (
    <span className="tabular-nums">
      {value} <span className="text-muted-foreground text-xs">{unit}</span>
    </span>
  );
}
