import { cn } from "@/lib/utils";

export function truncateAddress(address: string, edge = 6) {
  if (address.length <= edge * 2 + 3) return address;
  return `${address.slice(0, edge)}…${address.slice(-edge)}`;
}

export function Address({
  value,
  edge,
  className,
}: {
  value: string | null;
  edge?: number;
  className?: string;
}) {
  if (!value) {
    return (
      <span className={cn("text-muted-foreground text-sm", className)}>
        None
      </span>
    );
  }

  return (
    <span
      title={value}
      className={cn("font-address text-sm tracking-tight", className)}
    >
      {truncateAddress(value, edge)}
    </span>
  );
}
