/**
 * What the fiat boundary can actually do, read live from the anchor.
 *
 *   GET /api/anchor
 *     → 200 { homeDomain, protocol, assetCode, issuer, deposit, withdraw, fundsReserve }
 *     → 502 { error }  — the anchor did not answer
 *
 * `fundsReserve` is the field that keeps this honest. The deployed contracts
 * hold a self-issued test USDC and the anchor issues its own; until the two are
 * the same asset, a completed deposit funds a wallet and cannot fund a reserve.
 * Anything rendering this flow reads that flag and says which of the two it is
 * offering.
 */
import { anchorInfo, assetMatchesDeployment } from "@/lib/anchor";
import { USDC_ISSUER } from "@/lib/deployment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const NO_STORE = { "cache-control": "no-store" } as const;

export async function GET() {
  try {
    const info = await anchorInfo();
    return Response.json(
      {
        ...info,
        deploymentIssuer: USDC_ISSUER,
        fundsReserve: assetMatchesDeployment(info.issuer, USDC_ISSUER),
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    return Response.json(
      { error: (error as Error).message },
      { status: 502, headers: NO_STORE },
    );
  }
}
