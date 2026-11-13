/**
 * What a counterparty (a service, another agent) asks before dealing with a
 * NEAR agent. Read-only, no key, no wallet.
 *
 *   GET /api/near/verify/:agent
 *     -> 200 { agent, deal, reason, cert, confinement }   cert may be null
 *     -> 400 { error }   not a NEAR account id
 *     -> 502 { error }   testnet did not answer; no verdict rather than a wrong one
 *
 * `no-store`: a verdict is about now. A cached "deal" after the window opens
 * is the exact failure the certificate exists to prevent.
 */
import { getConfinement, verifyAgent } from "@/lib/near/bound";
import { BOUND_CONTRACT } from "@/lib/near/deployment";
import { assess, isNearAccountId } from "@/lib/near/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" } as const;

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/near/verify/[agent]">,
) {
  const { agent: raw } = await params;
  const agent = decodeURIComponent(raw).toLowerCase();
  if (!isNearAccountId(agent)) {
    return Response.json(
      { error: "not a NEAR account id" },
      { status: 400, headers: NO_STORE },
    );
  }
  const [lookup, confinement] = await Promise.all([
    verifyAgent(agent),
    getConfinement(agent),
  ]);
  if (!lookup.ok) {
    return Response.json(
      { error: "testnet RPC did not answer; no verdict" },
      { status: 502, headers: NO_STORE },
    );
  }
  const a = assess(lookup.value);
  return Response.json(
    {
      network: "testnet",
      contract: BOUND_CONTRACT,
      agent,
      deal: a.deal,
      reason: a.reason,
      cert: lookup.value,
      confinement,
    },
    { headers: NO_STORE },
  );
}
