/**
 * The arithmetic of an anchor's transfer limits. Pure, and safe on both sides
 * of the wire.
 *
 * Split out of `lib/anchor.ts` rather than exported from it: that module reads
 * `process.env` at module scope and imports `@stellar/stellar-sdk` for SEP-10
 * challenge validation, so a Client Component importing one function from it
 * would drag the whole chain SDK into the browser bundle. This file imports
 * nothing at all.
 */

export interface TransferLimits {
  enabled: boolean;
  /** In whole units of the asset, as the anchor states them. */
  minAmount: number | null;
  maxAmount: number | null;
}

interface RawLimits {
  enabled?: boolean;
  min_amount?: number;
  max_amount?: number;
}

/** Normalise one side of `/sep24/info` for a single asset. */
export function readLimits(
  side: Record<string, RawLimits> | undefined,
  code: string,
): TransferLimits {
  const entry = side?.[code];
  return {
    enabled: entry?.enabled === true,
    // `null` is "the anchor did not say", which is not "no limit" and is
    // certainly not zero. A UI that renders a missing cap as 0 refuses every
    // amount for a reason nobody can see.
    minAmount: typeof entry?.min_amount === "number" ? entry.min_amount : null,
    maxAmount: typeof entry?.max_amount === "number" ? entry.max_amount : null,
  };
}

/**
 * Why an anchor would refuse this amount in this direction, or null if it would
 * not.
 *
 * Takes the direction's own limits because SEP-24 states deposit and withdraw
 * separately and an anchor may differ between them. Checking both directions
 * against the deposit side happens to agree on the reference anchor, which is
 * exactly how that stays wrong without anyone noticing.
 *
 * `min` and `max` are inclusive, and a limit the anchor did not state
 * constrains nothing.
 */
export function amountRefusal(
  limits: TransferLimits,
  amount: number,
  assetCode: string,
): string | null {
  if (!limits.enabled) {
    return `This anchor does not offer this direction for ${assetCode}.`;
  }
  if (!Number.isFinite(amount) || amount <= 0) return "Enter an amount.";
  if (limits.maxAmount !== null && amount > limits.maxAmount) {
    return `This anchor caps a single transfer at ${limits.maxAmount} ${assetCode}.`;
  }
  if (limits.minAmount !== null && amount < limits.minAmount) {
    return `This anchor's minimum is ${limits.minAmount} ${assetCode}.`;
  }
  return null;
}
