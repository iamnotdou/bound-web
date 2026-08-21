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
  RegistryClient,
  contracts,
  network,
  readSource,
} from "@bound/sdk";

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
