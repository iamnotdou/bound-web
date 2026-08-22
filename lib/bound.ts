/**
 * The app's only certificate data source.
 *
 * SERVER ONLY. `@bound/sdk` reaches the chain over Soroban RPC and reads
 * `STELLAR_NETWORK` from the environment, so this module must never be pulled
 * into a client bundle — import it from Server Components only, and pass plain
 * `CertListItem` objects down to any `"use client"` component.
 *
 * Certificates are enumerated by certificate id, never by agent address. An
 * agent's mapping is overwritten by each new certificate published for it, so
 * it names the agent's *current* certificate rather than all of them — which
 * makes it the wrong key for a listing even now that `publish` authenticates
 * the agent as well as the operator. The SDK's reader documents this in full.
 *
 * No contract address or network endpoint belongs in this file; the SDK carries
 * the committed deployment data.
 */
import {
  listCertificates as sdkListCertificates,
  getCertificate as sdkGetCertificate,
  bound,
  toCertView,
  AuditorStakingClient,
  RegistryClient,
  ReserveVaultClient,
  contracts,
  network,
  readSource,
  type Certificate,
} from "@bound/sdk";
import { AssembledTransaction } from "@stellar/stellar-sdk/contract";

/**
 * The certificate's bound, in stroops.
 *
 * `getCertificate` formats it for display and the client wraps no read that
 * returns it raw, but the spend meter needs the exact number to sit the
 * counter next to — a ratio computed from a rounded dollar string would be a
 * number about a string rather than about the chain. So this goes to the
 * generated registry client directly, keyed by certificate id rather than by
 * agent, which is the only key a listing can trust.
 */
async function certBoundStroops(certId: bigint): Promise<bigint> {
  const registry = new RegistryClient({
    contractId: contracts.registry,
    networkPassphrase: network.passphrase,
    rpcUrl: network.rpcUrl,
    publicKey: readSource,
  });
  return (await registry.get_cert_bound({ cert_id: certId })).result;
}

export type CertStatusTag = "Pending" | "Verified" | "Invalid";

export interface CertListItem {
  certId: number;
  agent: string;
  /** Verified AND not expired — the only state a counterparty should accept. */
  valid: boolean;
  status: CertStatusTag;
  boundUsd: string; // already formatted, e.g. "$50,000"
  reserveUsd: string;
  auditorStakeUsd: string;
  auditor: string | null;
  expiresAtUnix: number;
  expiresAtIso: string | null;
  hasCert: boolean;
}

export async function listCertificates(opts?: {
  limit?: number;
  offset?: number;
}): Promise<CertListItem[]> {
  return sdkListCertificates(opts);
}

export async function getCertificate(
  certId: number,
): Promise<CertListItem | null> {
  return sdkGetCertificate(certId);
}

/**
 * What the PaymentRouter has metered against a certificate.
 *
 * `spentStroops` is **gross routed flow, not loss**. A certificate whose spend
 * has passed its bound has broken a covenant about its own conduct; it has not
 * thereby lost anyone that much money, and the contract sizes no payout from
 * it. Anything rendering this number has to say so, because reading it as harm
 * is the single easiest way to misread the protocol.
 *
 * `enrolled` is false for an agent that never joined the metered rail. Its
 * payments settle as ordinary token transfers and never reach the counter, so
 * the other fields say nothing at all about what it has spent.
 */
export interface SpendMeter {
  enrolled: boolean;
  /** The certificate the agent is metered against — not necessarily this one. */
  meteredCertId: number | null;
  spentStroops: string;
  boundStroops: string;
  floatStroops: string;
  floatCapStroops: string | null;
}

/** What the PremiumVault holds for a certificate. */
export interface Coverage {
  /** False when no premium has been paid. Every other field is then a quote. */
  paid: boolean;
  /** Priced bound x rate x term. Fixed at publish; waiting does not lower it. */
  quoteStroops: string;
  accruedStroops: string | null;
  claimableStroops: string | null;
}

/**
 * Both panels' data for one certificate.
 *
 * Every read is independent and any of them can fail on its own, so each is
 * caught separately and degraded to null rather than taking the page down. A
 * missing reading is rendered as missing; it is never rendered as a zero,
 * because "the router says nothing" and "the router says none" are different
 * claims and only one of them is ever true.
 */
export async function getCertificateActivity(
  certId: number,
  agent: string,
): Promise<{ meter: SpendMeter | null; coverage: Coverage | null }> {
  const id = BigInt(certId);

  const meter = await (async (): Promise<SpendMeter | null> => {
    try {
      const meteredCertId = await bound.routedCertId(agent);
      if (meteredCertId === null) {
        return {
          enrolled: false,
          meteredCertId: null,
          spentStroops: "0",
          boundStroops: "0",
          floatStroops: "0",
          floatCapStroops: null,
        };
      }
      // `float_cap` aborts for a certificate with no enrollment, and that abort
      // is indistinguishable from an RPC failure. Degrade it rather than let it
      // decide anything.
      const cap = await bound.floatCapForCert(id).catch(() => null);
      return {
        enrolled: true,
        meteredCertId,
        spentStroops: (await bound.spendForCert(id)).toString(),
        boundStroops: (await certBoundStroops(id)).toString(),
        floatStroops: (await bound.floatForCert(id)).toString(),
        floatCapStroops: cap === null ? null : cap.toString(),
      };
    } catch {
      return null;
    }
  })();

  const coverage = await (async (): Promise<Coverage | null> => {
    try {
      const quote = await bound.quotePremiumForCert(id);
      const paid = await bound.premiumPaid(id);
      if (!paid) {
        return {
          paid: false,
          quoteStroops: quote.toString(),
          accruedStroops: null,
          claimableStroops: null,
        };
      }
      return {
        paid: true,
        quoteStroops: quote.toString(),
        accruedStroops: (await bound.premiumAccrued(id)).toString(),
        claimableStroops: (await bound.premiumClaimable(id)).toString(),
      };
    } catch {
      return null;
    }
  })();

  return { meter, coverage };
}

/* ------------------------------------------------------------------ *
 * Live facts
 *
 * Everything above answers "what does the certificate claim?". Everything
 * below answers "what does the chain actually hold?" — which is a different
 * question, and the one `/app/cert/[id]` was previously answering with the
 * claim. A certificate can record a $1,000 reserve while its vault holds $0;
 * both numbers are true statements about different things, and only one of
 * them is money.
 * ------------------------------------------------------------------ */

/**
 * A Soroban persistent entry whose rent lapsed has been reclaimed, and reading
 * it fails in a way that is not "no such record" — the data existed, is gone
 * from the active state, and could be restored. `AssembledTransaction` raises
 * `ExpiredState` for exactly this, so it is caught by identity rather than by
 * scraping a message.
 *
 * This is defect L2. The app detects and explains it; it does not build the
 * `RestoreFootprint` transaction that would undo it.
 */
function isArchivalError(error: unknown): boolean {
  return (
    error instanceof AssembledTransaction.Errors.ExpiredState ||
    (error instanceof Error && error.name === "ExpiredStateError")
  );
}

function registryClient(): RegistryClient {
  return new RegistryClient({
    contractId: contracts.registry,
    networkPassphrase: network.passphrase,
    rpcUrl: network.rpcUrl,
    publicKey: readSource,
  });
}

/** Everything about one certificate that the chain can be asked, read live. */
export interface CertFacts {
  cert: CertListItem; // existing shape, unchanged
  reserve: {
    /** `Certificate.reserve_amount` — a claim recorded at publish time. */
    claimedStroops: string;
    /** `ReserveVault.get_balance(cert_id)` — the fact. null = unreadable. */
    vaultStroops: string | null;
  };
  allocation: {
    /** `Certificate.auditor_stake_snapshot`, frozen at attest time. */
    snapshotStroops: string;
    /** `AuditorStaking.get_allocation(cert_id)`, now. null = unreadable. */
    liveStroops: string | null;
  };
  freeze: {
    frozen: boolean;
    claimFreezeUnix: number | null;
    settlementDeadlineUnix: number | null;
  } | null;
  operator: string | null;
  /** An archival host error was seen while reading this certificate. */
  archived: boolean;
}

/**
 * Read every live fact about one certificate.
 *
 * Each read is caught on its own and degraded to `null`, never to `0`: "the
 * vault says nothing" and "the vault says none" are different claims and the
 * UI must be able to tell them apart. Returns `null` when the registry has no
 * readable record at all — see `isKnownCertId` for telling "never existed"
 * apart from "reclaimed".
 */
export async function getCertificateFacts(
  certId: number,
): Promise<CertFacts | null> {
  if (!Number.isInteger(certId) || certId < 1) return null;

  const id = BigInt(certId);
  const registry = registryClient();
  let archived = false;

  let record: Certificate;
  try {
    record = (await registry.get_certificate({ cert_id: id })).result;
  } catch {
    // Nothing else is worth reading: every other fact is keyed off a record
    // this one could not produce. Whether that is "never issued" or "ledger
    // entry reclaimed" is `isKnownCertId`'s question, not this one's.
    return null;
  }

  const cert: CertListItem = {
    ...toCertView(
      record.agent,
      {
        valid:
          record.status.tag === "Verified" &&
          BigInt(Math.floor(Date.now() / 1000)) <= record.expires_at,
        status: record.status,
        bound: record.bound,
        reserve: record.reserve_amount,
        auditor_stake: record.auditor_stake_snapshot,
        auditor: record.auditor,
        expires_at: record.expires_at,
      },
      certId,
    ),
    certId,
  };

  const vaultStroops = await (async (): Promise<string | null> => {
    try {
      const vault = new ReserveVaultClient({
        contractId: contracts.reserveVault,
        networkPassphrase: network.passphrase,
        rpcUrl: network.rpcUrl,
        publicKey: readSource,
      });
      return (await vault.get_balance({ cert_id: id })).result.toString();
    } catch (error) {
      if (isArchivalError(error)) archived = true;
      return null;
    }
  })();

  const liveStroops = await (async (): Promise<string | null> => {
    try {
      const staking = new AuditorStakingClient({
        contractId: contracts.auditorStaking,
        networkPassphrase: network.passphrase,
        rpcUrl: network.rpcUrl,
        publicKey: readSource,
      });
      return (await staking.get_allocation({ cert_id: id })).result.toString();
    } catch (error) {
      if (isArchivalError(error)) archived = true;
      return null;
    }
  })();

  const freeze = await (async (): Promise<CertFacts["freeze"]> => {
    try {
      const frozen = (await registry.is_frozen({ cert_id: id })).result;
      const claimFreeze = await registry
        .get_claim_freeze({ cert_id: id })
        .then((r) => Number(r.result))
        .catch(() => null);
      const deadline = await registry
        .get_cert_settlement_deadline({ cert_id: id })
        .then((r) => Number(r.result))
        .catch(() => null);
      return {
        frozen,
        // 0 is the contract's "no window", which is an absence, not a date.
        claimFreezeUnix:
          claimFreeze === null || claimFreeze === 0 ? null : claimFreeze,
        settlementDeadlineUnix:
          deadline === null || deadline === 0 ? null : deadline,
      };
    } catch (error) {
      if (isArchivalError(error)) archived = true;
      return null;
    }
  })();

  return {
    cert,
    reserve: {
      claimedStroops: record.reserve_amount.toString(),
      vaultStroops,
    },
    allocation: {
      snapshotStroops: record.auditor_stake_snapshot.toString(),
      liveStroops,
    },
    freeze,
    operator: record.operator ?? null,
    archived,
  };
}

/**
 * Whether the registry has ever issued this id.
 *
 * `getCertificateFacts` returning null is ambiguous on its own: the id may
 * never have existed, or its ledger entry may have been reclaimed (defect L2).
 * The certificate count is a separate, cheap entry that survives either way,
 * so an id inside it that cannot be read is a certificate that *did* exist.
 */
export async function isKnownCertId(certId: number): Promise<boolean> {
  if (!Number.isInteger(certId) || certId < 1) return false;
  try {
    const total = Number((await registryClient().get_cert_count()).result);
    return certId <= total;
  } catch {
    return false;
  }
}

/** How many certificates one page of the marketplace holds. */
export const CERT_PAGE_SIZE = 10;

export interface CertPage {
  items: CertListItem[];
  /** 1-based, and clamped into range — a page past the end is not an error. */
  page: number;
  pageCount: number;
  /** `Registry.get_cert_count()` — every certificate, not just this page. */
  total: number;
  pageSize: number;
}

/**
 * One page of the registry, newest first.
 *
 * The listing is not curated: it holds every certificate the registry has,
 * including junk from end-to-end runs and other people's experiments. A
 * permissionless registry filling up with weak certificates is the truth about
 * a permissionless registry.
 */
export async function listCertificatePage(page: number): Promise<CertPage> {
  const total = Number((await registryClient().get_cert_count()).result);
  const pageCount = Math.max(1, Math.ceil(total / CERT_PAGE_SIZE));
  const requested = Number.isFinite(page) ? Math.trunc(page) : 1;
  const clamped = Math.min(Math.max(1, requested), pageCount);
  const items =
    total <= 0
      ? []
      : await sdkListCertificates({
          limit: CERT_PAGE_SIZE,
          offset: (clamped - 1) * CERT_PAGE_SIZE,
        });
  return { items, page: clamped, pageCount, total, pageSize: CERT_PAGE_SIZE };
}
