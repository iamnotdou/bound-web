/**
 * Exact USDC formatting for numbers the SDK's `formatUsdc` would round away.
 *
 * `formatUsdc` divides by 1e7 through a float and renders at most three
 * decimals, which is right for a bound or a reserve and wrong for a premium: a
 * live accrual of 3,572 stroops comes out as `$0`, and `$0` is not a rounding
 * of the yield — it is the claim that there is none. A panel whose whole point
 * is that the auditor earns something cannot render that.
 *
 * So this formats the integer directly, never touching a float, and keeps
 * every significant digit down to the stroop.
 */
export function formatUsdcExact(stroops: bigint | string): string {
  const value = typeof stroops === "string" ? BigInt(stroops) : stroops;
  const negative = value < 0n;
  const abs = negative ? -value : value;

  const whole = abs / 10_000_000n;
  const frac = (abs % 10_000_000n)
    .toString()
    .padStart(7, "0")
    .replace(/0+$/, "");

  const grouped = whole.toLocaleString("en-US");
  return `${negative ? "-" : ""}$${grouped}${frac ? `.${frac}` : ""}`;
}

/** `a / b` as a percentage, clamped at nothing — over 100% is the point here. */
export function ratioPercent(
  a: bigint | string,
  b: bigint | string,
): number | null {
  const top = typeof a === "string" ? BigInt(a) : a;
  const bottom = typeof b === "string" ? BigInt(b) : b;
  if (bottom <= 0n) return null;
  return Number((top * 10_000n) / bottom) / 100;
}
