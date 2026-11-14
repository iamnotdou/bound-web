import { clsx } from "clsx";
import { ArrowLink } from "@/components/navy/arrow-link";
import { Text } from "@/components/navy/text";
import { explorerAccount, explorerTx } from "@/lib/near/format";

/**
 * Navy building blocks for the NEAR app pages (/app/near, cert, run).
 * Server-safe; no hooks. Labels are text, never badges.
 */

/** A certificate status as Navy's small uppercase label. */
export function StatusLabel({
  status,
  halted = false,
  tone = "default",
  className,
}: {
  status: string;
  halted?: boolean;
  tone?: "default" | "inverse";
  className?: string;
}) {
  const good = status === "Verified" && !halted;
  return (
    <Text
      tag="span"
      variant="textXS"
      className={clsx(
        "font-medium uppercase",
        tone === "inverse"
          ? "text-inverse-foreground"
          : good
            ? "text-primary"
            : "text-muted-foreground",
        className,
      )}
    >
      {status}
      {halted ? ", halted" : ""}
    </Text>
  );
}

/** A NEAR account id linking to NearBlocks. Switzer, never monospace. */
export function AccountLink({
  id,
  tone = "default",
  className,
}: {
  id: string;
  tone?: "default" | "inverse";
  className?: string;
}) {
  return (
    <a
      href={explorerAccount(id)}
      target="_blank"
      rel="noreferrer"
      title={`${id} on NearBlocks`}
      className={clsx(
        "rounded-sm break-all underline decoration-1 underline-offset-4 transition-colors focus-visible:ring-3 focus-visible:ring-primary/30 focus-visible:outline-none",
        tone === "inverse"
          ? "text-inverse-foreground decoration-inverse-foreground/40 hover:text-inverse-foreground/70"
          : "text-foreground decoration-border hover:text-primary",
        className,
      )}
    >
      {id}
    </a>
  );
}

/** A transaction hash, shortened, as an ArrowLink to NearBlocks. */
export function TxLink({
  hash,
  edge = 8,
  size = "xs",
}: {
  hash: string;
  edge?: number;
  size?: "xs" | "sm";
}) {
  const short =
    hash.length > edge * 2 + 1
      ? `${hash.slice(0, edge)}...${hash.slice(-4)}`
      : hash;
  return (
    <ArrowLink
      href={explorerTx(hash)}
      target="_blank"
      rel="noreferrer"
      title={hash}
      size={size}
    >
      {short}
    </ArrowLink>
  );
}

/** A mock USDC amount: the figure and its unit as plain text. */
export function Amount({
  value,
  unit = "mUSDC",
}: {
  value: string;
  unit?: string;
}) {
  return (
    <span className="tabular-nums">
      {value} {unit}
    </span>
  );
}

export function Unreadable({
  what,
  className,
}: {
  what: string;
  className?: string;
}) {
  return (
    <Text
      tag="p"
      variant="textSM"
      className={clsx("text-muted-foreground max-w-xl text-pretty", className)}
    >
      {what} could not be read from testnet just now. That is a failure to get
      an answer, not an answer; reload in a few seconds.
    </Text>
  );
}

/** Navy's hairline definition list (landing StatusPages pattern). */
export function FactList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <dl className={clsx("border-border border-b", className)}>{children}</dl>
  );
}

export function Fact({
  label,
  note,
  children,
}: {
  label: React.ReactNode;
  note?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border-border grid gap-2 border-t py-5 sm:grid-cols-2 sm:gap-8">
      <dt>
        <Text tag="span" variant="textSM" className="text-foreground block">
          {label}
        </Text>
        {note != null && (
          <Text
            tag="span"
            variant="textXS"
            className="text-muted-foreground mt-1 block text-pretty"
          >
            {note}
          </Text>
        )}
      </dt>
      <dd className="text-foreground min-w-0 text-sm wrap-anywhere">
        {children}
      </dd>
    </div>
  );
}

/** A section heading on the Navy grid: h2 displayMD plus optional intro. */
export function SectionHead({
  id,
  title,
  intro,
}: {
  id: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
}) {
  return (
    <>
      <Text
        tag="h2"
        id={id}
        variant="displayMD"
        className="text-foreground max-w-2xl tracking-tight text-balance"
      >
        {title}
      </Text>
      {intro != null && (
        <Text
          tag="p"
          variant="textBase"
          className="text-muted-foreground mt-4 max-w-2xl text-pretty"
        >
          {intro}
        </Text>
      )}
    </>
  );
}

/** Inline code in the app pages: Switzer, not monospace (docs only). */
export function Code({ children }: { children: React.ReactNode }) {
  return <code className="text-foreground font-sans">{children}</code>;
}
