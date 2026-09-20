/**
 * Open a transfer, in either direction, on whichever rail the anchor offers.
 *
 *   POST /api/anchor/transfer { token, kind, account, amount? }
 *     → 200 { protocol, id, url, instructions, payTo, moreInfoUrl }
 *     → 400 { error }  — unknown direction, missing token, not a G… account
 *     → 502 { error }  — the anchor refused or did not answer
 *
 * Both directions share a route because they are the same call with a different
 * noun, and the product needs both: a reserve funded from fiat is half a rail
 * if a proven claim cannot be paid back out to fiat.
 *
 * `url` is set on SEP-24 only: the anchor's own hosted form, opened in a popup
 * and never inlined in an iframe — it is where a real anchor collects identity
 * documents, and framing somebody else's KYC page inside our origin is not a
 * thing to do for layout convenience. On SEP-6 there is no page at all, and
 * `instructions` carries what the anchor wants done at a bank instead.
 */
import { startTransfer, type TransferKind } from "@/lib/anchor";
import { isTransferAmount } from "@/lib/anchor-limits";
import { isWalletAddress } from "@/lib/wallet-facts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const NO_STORE = { "cache-control": "no-store" } as const;
const KINDS: readonly TransferKind[] = ["deposit", "withdraw"];

function isKind(value: unknown): value is TransferKind {
  return (
    typeof value === "string" && (KINDS as readonly string[]).includes(value)
  );
}

export async function POST(request: Request) {
  let body: {
    token?: unknown;
    kind?: unknown;
    account?: unknown;
    amount?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "invalid JSON body" },
      { status: 400, headers: NO_STORE },
    );
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  const account = typeof body.account === "string" ? body.account.trim() : "";

  if (!isKind(body.kind)) {
    return Response.json(
      { error: `kind must be one of ${KINDS.join(", ")}` },
      { status: 400, headers: NO_STORE },
    );
  }
  if (!token) {
    return Response.json(
      { error: "authenticate with the anchor first" },
      { status: 400, headers: NO_STORE },
    );
  }
  if (!isWalletAddress(account)) {
    return Response.json(
      { error: "a Stellar account id is required" },
      { status: 400, headers: NO_STORE },
    );
  }

  // A rejected amount is a 400, not a silent drop. Opening the anchor's form
  // with nothing prefilled, while the UI shows the figure the user typed, is
  // the failure this replaced.
  let amount: string | undefined;
  if (body.amount !== undefined && body.amount !== null && body.amount !== "") {
    if (typeof body.amount !== "string" || !isTransferAmount(body.amount)) {
      return Response.json(
        {
          error: `amount must be a plain decimal number, e.g. "5" or "5.50" — got ${JSON.stringify(body.amount)}`,
        },
        { status: 400, headers: NO_STORE },
      );
    }
    amount = body.amount.trim();
  }

  try {
    return Response.json(
      await startTransfer(body.kind, token, { account, amount }),
      { headers: NO_STORE },
    );
  } catch (error) {
    return Response.json(
      { error: (error as Error).message },
      { status: 502, headers: NO_STORE },
    );
  }
}
