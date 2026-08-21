/**
 * Submit a wallet-signed envelope, poll it to completion, and return the tx
 * hash plus the decoded contract return value (the new certificate id for
 * `publish`, the challenge id for `challenge`).
 *
 *   POST /api/tx/submit  { xdr }
 *     → 200 { hash, result }
 *     → 400 { error }  — nothing submittable in the body
 *     → 502 { error }  — the network rejected or failed the transaction
 *
 * A signed envelope is self-authenticating, so this endpoint holds no key and
 * grants no authority it did not already receive from the signer.
 */
import { submitSignedXdr } from "@/lib/tx";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  let xdr: unknown;

  try {
    xdr = (await request.json())?.xdr;
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (typeof xdr !== "string" || xdr.trim() === "") {
    return Response.json(
      { error: "a signed xdr is required" },
      { status: 400 },
    );
  }

  try {
    return Response.json(await submitSignedXdr(xdr));
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 502 });
  }
}
