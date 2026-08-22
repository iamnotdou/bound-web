/**
 * What a certificate *is*, derived from what the chain says it holds.
 *
 * Pure and networkless on purpose. This is the part of the app that decides
 * whether a record is cover or a claim, and that decision has to be provable
 * without a testnet round trip — so every input arrives as a value, including
 * the clock.
 *
 * Safe in a client bundle: the only value it imports is the committed
 * deployment record, and `CertFacts` is a type, which erases.
 */
import { DEMO_AUDITOR } from "@/lib/deployment";
import type { CertFacts } from "@/lib/bound";

export type Lifecycle =
  | "archived" // ledger entry reclaimed (defect L2)
  | "frozen" // a claim window is open against it
  | "invalid" // status Invalid
  | "expired" // past expires_at
  | "verified" // Verified and unexpired — the only acceptable state
  | "pending-funded" // reserve fully funded, awaiting an auditor
  | "pending-partial" // vault holds some but not all of the claim
  | "pending-unfunded"; // vault holds nothing

/**
 * Fixed precedence, in the order the UI must apply it:
 *
 *   archived > frozen > invalid > expired > verified > funded > partial > unfunded
 *
 * Exported so a caller can sort or compare without re-deriving an order of its
 * own — the whole point of centralising this is that nothing else invents one.
 */
export const LIFECYCLE_PRECEDENCE: readonly Lifecycle[] = [
  "archived",
  "frozen",
  "invalid",
  "expired",
  "verified",
  "pending-funded",
  "pending-partial",
  "pending-unfunded",
];

export interface CertState {
  lifecycle: Lifecycle;
  /** `claimed - vault`, floored at zero. null when the vault is unreadable. */
  reserveShortfallStroops: string | null;
  /** `vault / claimed`. null when unreadable, or when nothing is claimed. */
  reserveFundedRatio: number | null;
  /** The live allocation is below the snapshot the certificate advertises. */
  allocationSlashed: boolean;
  /** The auditor is boundprotocol.dev's own demo auditor, not a third party. */
  demoAuditor: boolean;
  nextStep: "fund" | "attest" | "none";
}

function big(value: string | null): bigint | null {
  if (value === null) return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

/**
 * Whether the certificate's own auditor is the address `@bound/sdk` ships as
 * the demo auditor. That address is already public in the committed
 * deployment record; naming it here is disclosure, not a leak.
 */
export function isDemoAuditor(address: string | null | undefined): boolean {
  return address != null && address === DEMO_AUDITOR;
}

export function deriveCertState(facts: CertFacts, nowUnix: number): CertState {
  const claimed = big(facts.reserve.claimedStroops) ?? 0n;
  const vault = big(facts.reserve.vaultStroops);
  const snapshot = big(facts.allocation.snapshotStroops) ?? 0n;
  const live = big(facts.allocation.liveStroops);

  const shortfall =
    vault === null ? null : (claimed > vault ? claimed - vault : 0n).toString();

  const ratio =
    vault === null || claimed <= 0n
      ? null
      : Number((vault * 10_000n) / claimed) / 10_000;

  // An unreadable allocation is not a slashed one. Only a number below the
  // snapshot is evidence that capital left.
  const allocationSlashed = live !== null && live < snapshot;

  const expired = nowUnix > facts.cert.expiresAtUnix;

  const funding: Lifecycle =
    vault === null
      ? // The vault said nothing. This is a gate, not a reading: an
        // unreadable vault must not unlock "attest", so it falls to the
        // state that grants the least. The *reading* stays unknown —
        // `reserveShortfallStroops` and `reserveFundedRatio` are both null
        // here, and anything rendering a figure has to key off those, never
        // off the lifecycle, or it will print "$0" for "we could not ask".
        "pending-unfunded"
      : vault >= claimed
        ? "pending-funded"
        : vault > 0n
          ? "pending-partial"
          : "pending-unfunded";

  const lifecycle: Lifecycle = facts.archived
    ? "archived"
    : facts.freeze?.frozen === true
      ? "frozen"
      : facts.cert.status === "Invalid"
        ? "invalid"
        : expired
          ? "expired"
          : facts.cert.status === "Verified"
            ? "verified"
            : funding;

  const nextStep: CertState["nextStep"] =
    lifecycle === "pending-funded"
      ? "attest"
      : lifecycle === "pending-partial" || lifecycle === "pending-unfunded"
        ? "fund"
        : "none";

  return {
    lifecycle,
    reserveShortfallStroops: shortfall,
    reserveFundedRatio: ratio,
    allocationSlashed,
    demoAuditor: isDemoAuditor(facts.cert.auditor),
    nextStep,
  };
}

/** One sentence a reader can act on, for each state. Never dressed up. */
export const LIFECYCLE_SUMMARY: Record<Lifecycle, string> = {
  archived:
    "This certificate's ledger entry has been reclaimed by Soroban state archival. Nothing about it can be read until someone restores it.",
  frozen:
    "A claim window is open against this certificate. Its capital is frozen until the window closes and every admitted claim settles together.",
  invalid:
    "This certificate has been invalidated. Whatever backed it does not back it now.",
  expired:
    "This certificate has expired. Its capital commitments no longer bind.",
  verified:
    "Verified and unexpired — the only state a counterparty should accept.",
  "pending-funded":
    "The reserve is funded and matches what the certificate claims. It is waiting for a registered auditor to bond slashable capital behind it.",
  "pending-partial":
    "The vault holds part of the reserve this certificate claims. Until it holds all of it, no auditor can attest.",
  "pending-unfunded":
    "The reserve is a claimed number and no money has moved. Pending is not cover.",
};
