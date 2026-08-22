/**
 * What the chain says happened to one transaction.
 *
 *   GET /api/tx/:hash
 *     → 200 { hash, status: "SUCCESS" | "FAILED" | "NOT_FOUND", result }
 *     → 400 { error }  — not a 64-character hex hash
 *     → 502 { error }  — the RPC did not answer
 *
 * `NOT_FOUND` is a **status, not an error**. A hash the node has never seen and
 * a hash whose transaction failed are different facts, and collapsing them
 * would put the journal right back where the submit route left it: unable to
 * tell "still landing" from "rejected".
 *
 * Soroban RPC indexes classic transactions too, so a `changeTrust` submitted
 * through Horizon resolves here as well — verified against testnet.
 */
import { rpc, scValToNative } from "@stellar/stellar-sdk";
import { network } from "@bound/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const NO_STORE = { "cache-control": "no-store" } as const;
const HASH = /^[0-9a-f]{64}$/i;

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/tx/[hash]">,
) {
  const { hash } = await params;

  if (!HASH.test(hash)) {
    return Response.json(
      { error: "a 64-character hex transaction hash is required" },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const got = await new rpc.Server(network.rpcUrl).getTransaction(
      hash.toLowerCase(),
    );

    let result: unknown = null;
    if (got.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      try {
        if (got.returnValue) {
          const native = scValToNative(got.returnValue);
          result = typeof native === "bigint" ? Number(native) : native;
        }
      } catch {
        // A return value this app cannot decode is still a success. Reporting
        // the transaction as failed because of a decoding problem here would
        // be the same lie in a different place.
      }
    }

    return Response.json(
      { hash: hash.toLowerCase(), status: got.status, result },
      { headers: NO_STORE },
    );
  } catch (error) {
    return Response.json(
      { error: (error as Error).message },
      { status: 502, headers: NO_STORE },
    );
  }
}
