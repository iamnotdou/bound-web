/**
 * What the anchor says happened to one transfer.
 *
 *   GET /api/anchor/transfer/:id       (Authorization: Bearer <SEP-10 token>)
 *     → 200 { id, kind, status, amountIn, amountOut, stellarTransactionId, message }
 *     → 401 { error }  — no token; the anchor will not discuss somebody's transfer
 *     → 502 { error }  — the anchor did not answer
 *
 * A read: no signature, no fee, no state change. `stellarTransactionId` is the
 * field that matters — it is null until the anchor has actually moved the money
 * on-chain, which is the difference between a form somebody filled in and a
 * balance that exists.
 */
import { readTransfer } from "@/lib/anchor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const NO_STORE = { "cache-control": "no-store" } as const;

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/anchor/transfer/[id]">,
) {
  const { id } = await params;
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();

  if (!token) {
    return Response.json(
      { error: "authenticate with the anchor first" },
      { status: 401, headers: NO_STORE },
    );
  }

  try {
    return Response.json(await readTransfer(token, id), { headers: NO_STORE });
  } catch (error) {
    return Response.json(
      { error: (error as Error).message },
      { status: 502, headers: NO_STORE },
    );
  }
}
