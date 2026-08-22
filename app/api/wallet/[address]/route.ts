/**
 * Everything the server can say about one connected wallet.
 *
 *   GET /api/wallet/:address?certId=N
 *     → 200 { facts, gates, certId, cert }
 *     → 400 { error }  — not a G… account id
 *     → 502 { error }  — Horizon did not answer; no facts rather than wrong ones
 *
 * `cert` is a compact view of the certificate the gates were computed against
 * — the same read, handed back rather than thrown away, so a client panel can
 * render the live vault balance beside the claim without asking a second time.
 * It is null when no `certId` was given or the certificate could not be read.
 *
 * `no-store`, always. The page shell around it is cached for everyone; this is
 * one visitor's balance, and serving a cached copy of it to the next visitor
 * would be the worst kind of wrong number — plausible, specific and someone
 * else's.
 */
import { getCertificateFacts } from "@/lib/bound";
import { deriveCertState } from "@/lib/cert-state";
import { gates } from "@/lib/preconditions";
import { isWalletAddress, readWalletFacts } from "@/lib/wallet-facts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NO_STORE = { "cache-control": "no-store" } as const;

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/wallet/[address]">,
) {
  const { address } = await params;

  if (!isWalletAddress(address)) {
    return Response.json(
      { error: "not a Stellar account id" },
      { status: 400, headers: NO_STORE },
    );
  }

  const raw = new URL(request.url).searchParams.get("certId");
  const certId = raw !== null && /^\d+$/.test(raw) ? Number(raw) : null;

  let facts;
  try {
    facts = await readWalletFacts(address);
  } catch (error) {
    return Response.json(
      { error: (error as Error).message },
      { status: 502, headers: NO_STORE },
    );
  }

  const cert = certId === null ? null : await getCertificateFacts(certId);
  const now = Math.floor(Date.now() / 1000);
  const state = cert === null ? null : deriveCertState(cert, now);

  return Response.json(
    {
      facts,
      certId,
      cert:
        cert === null || state === null
          ? null
          : {
              certId: cert.cert.certId,
              status: cert.cert.status,
              auditor: cert.cert.auditor,
              operator: cert.operator,
              expiresAtUnix: cert.cert.expiresAtUnix,
              claimedStroops: cert.reserve.claimedStroops,
              vaultStroops: cert.reserve.vaultStroops,
              allocationSnapshotStroops: cert.allocation.snapshotStroops,
              allocationLiveStroops: cert.allocation.liveStroops,
              lifecycle: state.lifecycle,
              nextStep: state.nextStep,
              reserveShortfallStroops: state.reserveShortfallStroops,
              reserveFundedRatio: state.reserveFundedRatio,
              demoAuditor: state.demoAuditor,
            },
      gates: gates({
        address,
        wallet: facts,
        facts: cert,
        state,
        nowUnix: now,
      }),
    },
    { headers: NO_STORE },
  );
}
