/**
 * Build an unsigned (assembled) envelope for the connected wallet to sign.
 *
 *   POST /api/tx/build  { action, address, params }
 *     → 200 { xdr, networkPassphrase }
 *     → 400 { error }  — unknown action, or the builder/simulation rejected it
 *
 * The wallet is both the transaction source and the `require_auth` address, so
 * the returned envelope needs exactly one signature and no secret key is used
 * here. The build simulates against the chain, so a request that could never
 * succeed (unregistered auditor, missing trustline, …) fails *here*, with the
 * contract's own message, rather than after the user has signed.
 */
import {
  buildActionXdr,
  isWalletAction,
  networkPassphrase,
  type BuildParams,
} from "@/lib/tx";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: {
    action?: unknown;
    address?: unknown;
    params?: BuildParams;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { action } = body;
  const address = typeof body.address === "string" ? body.address.trim() : "";
  const params = (body.params ?? {}) as BuildParams;

  if (!isWalletAction(action)) {
    return Response.json(
      { error: `unknown action: ${String(action)}` },
      { status: 400 },
    );
  }
  if (!address) {
    return Response.json(
      { error: "a connected wallet address is required" },
      { status: 400 },
    );
  }

  try {
    const xdr = await buildActionXdr(action, address, params);
    return Response.json({ xdr, networkPassphrase: networkPassphrase() });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 });
  }
}
