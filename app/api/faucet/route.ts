/**
 * Test XLM and test USDC for a wallet that has neither.
 *
 *   GET  /api/faucet             → { configured, address, availableStroops, grantStroops, empty }
 *   POST /api/faucet { address } → 200 { step, hash?, amountStroops? }
 *                                → 400 { error, code }        — nothing to send it to
 *                                → 429 { error, code, retryAfterUnix }
 *                                → 503 { error, code }        — the faucet is empty
 *
 * Two steps behind one door, because they are two steps of the same problem:
 * an address with no account gets one from friendbot; an address with an open
 * trustline gets USDC. In between the caller has to sign a `changeTrust`
 * themselves — the faucet cannot open a trustline on somebody else's account,
 * and would not want the authority to.
 *
 * The USDC comes from a dedicated faucet account's own balance. See
 * `lib/faucet.ts` for why that is not the issuer.
 */
import {
  FAUCET_COOLDOWN_SECONDS,
  FAUCET_GRANT_STROOPS,
  FaucetNotConfigured,
  faucetKeypair,
  formatStroops,
  friendbot,
  readAccount,
  sendUsdc,
} from "@/lib/faucet";
import { isWalletAddress } from "@/lib/wallet-facts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NO_STORE = { "cache-control": "no-store" } as const;

/**
 * Last grant per address, in this process.
 *
 * On serverless this resets whenever a new instance starts and is not shared
 * between instances, so it is **not** a rate limit — it is a courtesy that
 * stops the obvious double-click. The response says so rather than implying a
 * guarantee nothing here can make. A durable limiter arrives with the database.
 */
const lastGrant = new Map<string, number>();

const COOLDOWN_CAVEAT =
  "This cooldown is per server instance and resets when one starts, so it is a courtesy rather than a rate limit.";

export async function GET() {
  let address: string;
  try {
    address = faucetKeypair().publicKey();
  } catch (error) {
    return Response.json(
      {
        configured: false,
        error:
          error instanceof FaucetNotConfigured
            ? error.message
            : (error as Error).message,
      },
      { status: 200, headers: NO_STORE },
    );
  }

  try {
    const account = await readAccount(address);
    const available = account.usdcStroops;
    return Response.json(
      {
        configured: true,
        address,
        accountExists: account.exists,
        // null means "Horizon did not tell us", which is not the same as
        // empty. The `empty` flag stays false so nothing renders "$0".
        availableStroops: available === null ? null : available.toString(),
        grantStroops: FAUCET_GRANT_STROOPS.toString(),
        empty: available !== null && available < FAUCET_GRANT_STROOPS,
        cooldownSeconds: FAUCET_COOLDOWN_SECONDS,
        cooldownCaveat: COOLDOWN_CAVEAT,
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    return Response.json(
      { configured: true, address, error: (error as Error).message },
      { status: 502, headers: NO_STORE },
    );
  }
}

export async function POST(request: Request) {
  let address: unknown;
  try {
    address = (await request.json())?.address;
  } catch {
    return Response.json(
      { error: "invalid JSON body" },
      { status: 400, headers: NO_STORE },
    );
  }

  if (typeof address !== "string" || !isWalletAddress(address)) {
    return Response.json(
      { error: "a Stellar account id is required", code: "no-wallet" },
      { status: 400, headers: NO_STORE },
    );
  }

  let faucet;
  try {
    faucet = faucetKeypair();
  } catch (error) {
    return Response.json(
      { error: (error as Error).message, code: "no-usdc" },
      { status: 503, headers: NO_STORE },
    );
  }

  // Paying the faucet from the faucet is a self-transfer: the balance is
  // unchanged, a network fee is burned, and the caller is told it succeeded.
  // Refused rather than dressed up, because "granted $10,000" would be false
  // about the only account it can never grant to.
  if (address === faucet.publicKey()) {
    return Response.json(
      {
        error:
          "That is the faucet's own address. It cannot grant to itself — the transfer would move nothing and still cost a fee.",
        code: "no-wallet",
      },
      { status: 400, headers: NO_STORE },
    );
  }

  let recipient;
  try {
    recipient = await readAccount(address);
  } catch (error) {
    return Response.json(
      { error: (error as Error).message },
      { status: 502, headers: NO_STORE },
    );
  }

  // Step one: there is no account to pay yet.
  if (!recipient.exists) {
    try {
      await friendbot(address);
    } catch (error) {
      return Response.json(
        { error: (error as Error).message },
        { status: 502, headers: NO_STORE },
      );
    }
    return Response.json(
      {
        step: "account",
        message:
          "Friendbot created this account and funded it with test XLM. Open a USDC trustline next — that transaction is yours to sign.",
      },
      { headers: NO_STORE },
    );
  }

  // Step two needs somewhere for the USDC to land.
  if (!recipient.trustlineOpen) {
    return Response.json(
      {
        error:
          "This wallet has no USDC trustline, so there is nowhere for the USDC to go. Open one — the faucet cannot do it for you, and should not be able to.",
        code: "no-trustline",
      },
      { status: 400, headers: NO_STORE },
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const previous = lastGrant.get(address);
  if (previous !== undefined && now - previous < FAUCET_COOLDOWN_SECONDS) {
    const retryAfterUnix = previous + FAUCET_COOLDOWN_SECONDS;
    return Response.json(
      {
        error: `This address was topped up less than an hour ago. It can ask again after ${new Date(retryAfterUnix * 1000).toISOString()}.`,
        code: "cooldown",
        retryAfterUnix,
        caveat: COOLDOWN_CAVEAT,
      },
      {
        status: 429,
        headers: { ...NO_STORE, "retry-after": String(retryAfterUnix - now) },
      },
    );
  }

  // Read the faucet's own balance before starting a transfer that would fail
  // halfway. "The faucet is empty" is a thing a visitor can act on; a classic
  // `op_underfunded` is not.
  let faucetAccount;
  try {
    faucetAccount = await readAccount(faucet.publicKey());
  } catch (error) {
    return Response.json(
      { error: (error as Error).message },
      { status: 502, headers: NO_STORE },
    );
  }

  if (!faucetAccount.exists || faucetAccount.usdcStroops === null) {
    return Response.json(
      {
        error:
          "The faucet account holds no USDC trustline on this network, so it has nothing to send. Run scripts/setup-demo.ts.",
        code: "no-usdc",
        faucetAddress: faucet.publicKey(),
      },
      { status: 503, headers: NO_STORE },
    );
  }

  if (faucetAccount.usdcStroops < FAUCET_GRANT_STROOPS) {
    return Response.json(
      {
        error: `The faucet is empty: it holds ${formatStroops(faucetAccount.usdcStroops)} and a grant is ${formatStroops(FAUCET_GRANT_STROOPS)}. Nothing was sent. It has to be refilled before this wallet can be funded.`,
        code: "no-usdc",
        faucetAddress: faucet.publicKey(),
        availableStroops: faucetAccount.usdcStroops.toString(),
        grantStroops: FAUCET_GRANT_STROOPS.toString(),
      },
      { status: 503, headers: NO_STORE },
    );
  }

  try {
    const { hash } = await sendUsdc(address, FAUCET_GRANT_STROOPS);
    lastGrant.set(address, now);
    return Response.json(
      {
        step: "usdc",
        hash,
        amountStroops: FAUCET_GRANT_STROOPS.toString(),
        cooldownSeconds: FAUCET_COOLDOWN_SECONDS,
        caveat: COOLDOWN_CAVEAT,
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
