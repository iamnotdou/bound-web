/**
 * SEP-10: prove to the anchor that the connected wallet is who it says.
 *
 *   GET  /api/anchor/auth?address=G…  → 200 { xdr, networkPassphrase }
 *   POST /api/anchor/auth { signedXdr } → 200 { token }
 *     → 400 { error }  — not a G… account, or nothing signed in the body
 *     → 502 { error }  — the anchor did not answer, or answered with something
 *                        that is not a valid challenge
 *
 * The GET is the important half. It does not merely fetch the challenge, it
 * verifies it before this app will show it to a wallet: sequence zero, source
 * equal to the anchor's declared SIGNING_KEY, the home-domain operation, and
 * the anchor's own signature. We are asking somebody to sign a transaction we
 * fetched from a third party, and a wallet approval dialog is the last place
 * that question should be settled.
 *
 * No key is held here. The token the POST returns authenticates one account at
 * one anchor and is handed straight back to the browser that earned it — this
 * app has no session store and inventing one to hold somebody else's bearer
 * token would be the worse option. It belongs in memory for the length of the
 * flow, never in localStorage.
 */
import { sep10Challenge, sep10Token } from "@/lib/anchor";
import { isWalletAddress } from "@/lib/wallet-facts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const NO_STORE = { "cache-control": "no-store" } as const;

export async function GET(request: Request) {
  const address =
    new URL(request.url).searchParams.get("address")?.trim() ?? "";

  if (!isWalletAddress(address)) {
    return Response.json(
      { error: "a Stellar account id is required" },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    return Response.json(await sep10Challenge(address), { headers: NO_STORE });
  } catch (error) {
    return Response.json(
      { error: (error as Error).message },
      { status: 502, headers: NO_STORE },
    );
  }
}

export async function POST(request: Request) {
  let signedXdr: unknown;
  try {
    signedXdr = (await request.json())?.signedXdr;
  } catch {
    return Response.json(
      { error: "invalid JSON body" },
      { status: 400, headers: NO_STORE },
    );
  }

  if (typeof signedXdr !== "string" || signedXdr.trim() === "") {
    return Response.json(
      { error: "a signed challenge is required" },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    return Response.json(
      { token: await sep10Token(signedXdr) },
      { headers: NO_STORE },
    );
  } catch (error) {
    return Response.json(
      { error: (error as Error).message },
      { status: 502, headers: NO_STORE },
    );
  }
}
