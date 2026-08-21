/** Presentation helper: turn a unix expiry into "in 3 months" / "14 days ago". */
export function relativeFromNow(unixSeconds: number, now = Date.now()) {
  const deltaSeconds = unixSeconds - Math.floor(now / 1000);
  const abs = Math.abs(deltaSeconds);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];

  for (const [unit, seconds] of units) {
    if (abs >= seconds) {
      return formatter.format(Math.trunc(deltaSeconds / seconds), unit);
    }
  }
  return formatter.format(deltaSeconds, "second");
}

export function formatExpiry(iso: string | null) {
  if (!iso) return "No expiry";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function isExpired(unixSeconds: number, now = Date.now()) {
  return unixSeconds * 1000 < now;
}
