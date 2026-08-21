/**
 * The app's only certificate data source.
 *
 * SERVER ONLY. `@bound/sdk` reaches the chain over Soroban RPC and reads
 * `STELLAR_NETWORK` from the environment, so this module must never be pulled
 * into a client bundle — import it from Server Components only, and pass plain
 * `CertListItem` objects down to any `"use client"` component.
 *
 * Certificates are enumerated by certificate id, never by agent address. The
 * Registry's `publish` authenticates only the operator and then overwrites the
 * agent-to-certificate mapping unconditionally, so that mapping cannot be
 * trusted to drive a listing. The SDK's reader documents this in full.
 *
 * No contract address or network endpoint belongs in this file; the SDK carries
 * the committed deployment data.
 */
import {
  listCertificates as sdkListCertificates,
  getCertificate as sdkGetCertificate,
} from "@bound/sdk";

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
