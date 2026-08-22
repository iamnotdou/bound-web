/**
 * The test-USDC faucet's own account.
 *
 * SERVER ONLY, and the one place in this app that holds a secret key.
 *
 * `FAUCET_SECRET` is a **dedicated, disposable account that transfers**, not
 * the USDC issuer. That distinction is the whole security story: the issuer
 * key can mint without limit and is the operator of every seeded certificate,
 * so a leak there is administrative control over the token. A leak here costs
 * whatever test USDC the faucet was holding, and the answer is to rotate it.
 * The issuer key never reaches a route handler and is never added to Vercel.
 */
import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { network } from "@bound/sdk";
import { USDC_ISSUER } from "@/lib/deployment";

/** What one successful grant moves. Round number, easily changed. */
export const FAUCET_GRANT_STROOPS = 10_000n * 10_000_000n;

/** How long one address waits between grants. */
export const FAUCET_COOLDOWN_SECONDS = 60 * 60;

export const USDC_ASSET_CODE = "USDC";

function usdcAsset(): Asset {
  return new Asset(USDC_ASSET_CODE, USDC_ISSUER);
}

function horizon(): Horizon.Server {
  return new Horizon.Server(network.horizonUrl);
}

export class FaucetNotConfigured extends Error {
  constructor() {
    super(
      "FAUCET_SECRET is not set on this deployment, so the faucet cannot sign anything.",
    );
    this.name = "FaucetNotConfigured";
  }
}

/**
 * Whether this deployment can hand out test assets at all.
 *
 * Anything that *promises* a visitor test XLM or USDC has to ask this first. A
 * deployment without the key still works — you bring your own funded wallet —
 * but a page that says otherwise is making a promise the server cannot keep.
 *
 * Server-only, and read at render rather than kept: setting the variable takes
 * effect on the next deploy, which fails toward the cautious sentence rather
 * than the confident one.
 */
export function faucetConfigured(): boolean {
  return Boolean(process.env.FAUCET_SECRET?.trim());
}

export function faucetKeypair(): Keypair {
  const secret = process.env.FAUCET_SECRET?.trim();
  if (!secret) throw new FaucetNotConfigured();
  try {
    return Keypair.fromSecret(secret);
  } catch {
    throw new Error("FAUCET_SECRET is not a valid Stellar secret key.");
  }
}

export interface AccountSnapshot {
  exists: boolean;
  xlm: string | null;
  trustlineOpen: boolean;
  usdcStroops: bigint | null;
}

export function toStroops(decimal: string): bigint {
  const [whole, frac = ""] = decimal.split(".");
  const padded = (frac + "0000000").slice(0, 7);
  return BigInt(whole || "0") * 10_000_000n + BigInt(padded || "0");
}

export function formatStroops(stroops: bigint): string {
  const whole = stroops / 10_000_000n;
  const frac = (stroops % 10_000_000n)
    .toString()
    .padStart(7, "0")
    .replace(/0+$/, "");
  return `$${whole.toLocaleString("en-US")}${frac ? `.${frac}` : ""}`;
}

export async function readAccount(address: string): Promise<AccountSnapshot> {
  const response = await fetch(
    `${network.horizonUrl}/accounts/${encodeURIComponent(address)}`,
    { cache: "no-store" },
  );
  if (response.status === 404) {
    return {
      exists: false,
      xlm: null,
      trustlineOpen: false,
      usdcStroops: null,
    };
  }
  if (!response.ok) {
    throw new Error(`Horizon returned ${response.status} for ${address}`);
  }
  const body = (await response.json()) as {
    balances?: {
      balance: string;
      asset_type: string;
      asset_code?: string;
      asset_issuer?: string;
    }[];
  };
  const balances = body.balances ?? [];
  const native = balances.find((b) => b.asset_type === "native");
  const usdc = balances.find(
    (b) => b.asset_code === USDC_ASSET_CODE && b.asset_issuer === USDC_ISSUER,
  );
  return {
    exists: true,
    xlm: native?.balance ?? null,
    trustlineOpen: usdc !== undefined,
    usdcStroops: usdc ? toStroops(usdc.balance) : null,
  };
}

/** Create an account from the network's own friendbot. Idempotent enough. */
export async function friendbot(address: string): Promise<void> {
  const response = await fetch(
    `https://friendbot.stellar.org/?addr=${encodeURIComponent(address)}`,
  );
  if (!response.ok && response.status !== 400) {
    throw new Error(`friendbot returned ${response.status}`);
  }
  // 400 is friendbot's "this account already exists", which is the state we
  // wanted anyway.
}

/**
 * Move USDC out of the faucet's own balance.
 *
 * A classic payment, not a Soroban invocation: the testnet USDC is a classic
 * asset with a SAC wrapping it, so the trustline balance a payment moves *is*
 * the balance the contracts read. It is also cheaper, needs no footprint, and
 * fails in Horizon's own words rather than in a host trap.
 */
export async function sendUsdc(
  to: string,
  stroops: bigint,
): Promise<{ hash: string }> {
  const keypair = faucetKeypair();
  const server = horizon();
  const source = await server.loadAccount(keypair.publicKey());
  const amount = formatAmount(stroops);

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: network.passphrase,
  })
    .addOperation(
      Operation.payment({ destination: to, asset: usdcAsset(), amount }),
    )
    .setTimeout(60)
    .build();

  tx.sign(keypair);
  const result = await server.submitTransaction(tx);
  return { hash: result.hash };
}

/** Stroops → the decimal string Horizon's payment operation wants. */
export function formatAmount(stroops: bigint): string {
  const whole = stroops / 10_000_000n;
  const frac = (stroops % 10_000_000n).toString().padStart(7, "0");
  return `${whole}.${frac}`;
}
