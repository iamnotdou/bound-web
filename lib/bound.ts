/**
 * ============================================================================
 * FIXTURE DATA — NOT REAL CHAIN DATA.
 * ============================================================================
 * This module is the ONLY place in the app that knows where certificate data
 * comes from. Everything below the `CertListItem` type is a hard-coded,
 * in-memory sample set so the marketplace UI can be built and reviewed before
 * the chain reader lands.
 *
 * To go live: replace the BODY of `listCertificates` and `getCertificate` with
 * calls to `@bound/sdk`'s `listCertificates`. The exported types and function
 * signatures below already match the SDK's shape, so no other file in the app
 * needs to change — delete `FIXTURE_CERTIFICATES` and swap the two bodies.
 *
 * Nothing here should ever be imported by UI code other than through these two
 * functions, and no contract address / network endpoint belongs in this file.
 * ============================================================================
 */

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

/** Seconds in a day, used only to build readable fixture expiry dates. */
const DAY = 86_400;

/** Fixed "now" is avoided on purpose: fixtures are relative to render time. */
function daysFromNow(days: number): number {
  return Math.floor(Date.now() / 1000) + days * DAY;
}

function iso(unix: number): string {
  return new Date(unix * 1000).toISOString();
}

/** FIXTURE ONLY — replaced wholesale by the SDK. */
function fixture(
  certId: number,
  agent: string,
  status: CertStatusTag,
  boundUsd: string,
  reserveUsd: string,
  auditorStakeUsd: string,
  auditor: string | null,
  expiresInDays: number,
): CertListItem {
  const expiresAtUnix = daysFromNow(expiresInDays);
  const expired = expiresInDays <= 0;
  return {
    certId,
    agent,
    valid: status === "Verified" && !expired,
    status,
    boundUsd,
    reserveUsd,
    auditorStakeUsd,
    auditor,
    expiresAtUnix,
    expiresAtIso: iso(expiresAtUnix),
    hasCert: true,
  };
}

/** FIXTURE ONLY — delete once `@bound/sdk` backs the functions below. */
const FIXTURE_CERTIFICATES: CertListItem[] = [
  fixture(
    1041,
    "GAZKB7SVQK3P4LTX2YQJ6NMWTZ5RCDUHY7FEJ3OQWL2XAVI6BND4RPTC",
    "Verified",
    "$250,000",
    "$62,500",
    "$40,000",
    "GBRTMWX4YJ7ZQDN5HLKPU3AV2OCE6SIF9GJXQKR8TDWNZUYM4HAPLVC2",
    212,
  ),
  fixture(
    1038,
    "GDQ7HLMPU2XKAY3NWTJ6ZRCF5OBEVI9SGKX4QDMTHLZP8AWNYUCRB3JF",
    "Verified",
    "$100,000",
    "$25,000",
    "$18,000",
    "GBRTMWX4YJ7ZQDN5HLKPU3AV2OCE6SIF9GJXQKR8TDWNZUYM4HAPLVC2",
    94,
  ),
  fixture(
    1035,
    "GCVN8TZQKLP5RWAX3MJHU6YDBI2OEF7SGQ4XCTRLZAWNPKUM9HDYVBJ3",
    "Verified",
    "$50,000",
    "$50,000",
    "$12,500",
    "GAWQ6XZTLN3PKYVR7MHDUC2AB5OIEJ9SFGX4QTRLZMWNPKUY8HCDVB2J",
    31,
  ),
  fixture(
    1032,
    "GBHU4PQZTMK7RWLX9NCJY6ADEI3OBF5SGVX2QTRLZAWNPKUM8HDYVCJ4",
    "Pending",
    "$75,000",
    "$18,750",
    "$0",
    null,
    120,
  ),
  fixture(
    1029,
    "GDMT5ZQXKLP2RWAY8NCJU6HDBI4OEF9SGVX3QTRLZAWNPKUM7HDYVBJ5",
    "Verified",
    "$1,000,000",
    "$300,000",
    "$150,000",
    "GCKX9WZTLN4PQYVR6MHDUC3AB8OIEJ2SFGX5QTRLZMWNPKUY7HCDVB1J",
    365,
  ),
  fixture(
    1024,
    "GAYP3ZQXKLM8RWTU5NCJH6ADBI7OEF4SGVX9QTRLZAWNPKUM2HDYVCJ6",
    "Invalid",
    "$40,000",
    "$4,000",
    "$0",
    "GAWQ6XZTLN3PKYVR7MHDUC2AB5OIEJ9SFGX4QTRLZMWNPKUY8HCDVB2J",
    58,
  ),
  fixture(
    1019,
    "GCTR7ZQXKLP4RWAY9NCJU6HDBI5OEF3SGVX8QTRLZAWNPKUM6HDYVBJ7",
    "Verified",
    "$500,000",
    "$125,000",
    "$90,000",
    "GCKX9WZTLN4PQYVR6MHDUC3AB8OIEJ2SFGX5QTRLZMWNPKUY7HCDVB1J",
    -14,
  ),
  fixture(
    1015,
    "GBQN2ZQXKLP6RWAY4NCJU9HDBI8OEF5SGVX7QTRLZAWNPKUM3HDYVBJ8",
    "Pending",
    "$25,000",
    "$6,250",
    "$0",
    null,
    47,
  ),
  fixture(
    1011,
    "GDXW6ZQXKLP9RWAY2NCJU5HDBI3OEF8SGVX4QTRLZAWNPKUM1HDYVBJ9",
    "Verified",
    "$150,000",
    "$45,000",
    "$30,000",
    "GBRTMWX4YJ7ZQDN5HLKPU3AV2OCE6SIF9GJXQKR8TDWNZUYM4HAPLVC2",
    173,
  ),
  fixture(
    1007,
    "GAKF8ZQXKLP3RWAY7NCJU2HDBI6OEF1SGVX5QTRLZAWNPKUM9HDYVBJ2",
    "Invalid",
    "$10,000",
    "$500",
    "$0",
    null,
    9,
  ),
  fixture(
    1003,
    "GCLV4ZQXKLP7RWAY1NCJU8HDBI9OEF6SGVX2QTRLZAWNPKUM5HDYVBJ3",
    "Verified",
    "$80,000",
    "$20,000",
    "$16,000",
    "GAWQ6XZTLN3PKYVR7MHDUC2AB5OIEJ9SFGX4QTRLZMWNPKUY8HCDVB2J",
    68,
  ),
];

export async function listCertificates(opts?: {
  limit?: number;
  offset?: number;
}): Promise<CertListItem[]> {
  // FIXTURE BODY — replace with `@bound/sdk`'s `listCertificates(opts)`.
  const offset = opts?.offset ?? 0;
  const limit = opts?.limit ?? FIXTURE_CERTIFICATES.length;
  return FIXTURE_CERTIFICATES.slice(offset, offset + limit);
}

export async function getCertificate(
  certId: number,
): Promise<CertListItem | null> {
  // FIXTURE BODY — replace with a single-certificate read from `@bound/sdk`.
  const all = await listCertificates();
  return all.find((cert) => cert.certId === certId) ?? null;
}
