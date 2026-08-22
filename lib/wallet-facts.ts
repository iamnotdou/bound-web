/**
 * What one connected wallet can do, read live.
 *
 * SERVER ONLY for the reader; the `WalletFacts` type is safe to import from a
 * Client Component because a type erases.
 *
 * These facts are deliberately *not* part of the cached page shell. `/app` and
 * `/app/cert/[id]` are rendered once and revalidated on a timer, which is right
 * for chain facts that are the same for everyone and catastrophic for a
 * balance: one visitor's USDC would be served to the next. So the wallet's
 * side of the picture is one client fetch against a `no-store` route.
 */
import {
  AuditorStakingClient,
  contracts,
  network,
  readSource,
} from "@bound/sdk";
import { DEMO_AUDITOR, USDC_ISSUER } from "@/lib/deployment";

export interface WalletFacts {
  address: string;
  /** Horizon 404 ⇒ the account does not exist and friendbot is the next step. */
  accountExists: boolean;
  xlmBalance: string | null;
  trustlineOpen: boolean;
  /** USDC in stroops. null when the account does not exist or was unreadable. */
  usdcStroops: string | null;
  auditor: {
    registered: boolean;
    minStakeStroops: string;
    freeStakeStroops: string;
    allocatedStroops: string;
  } | null;
  isDemoAuditor: boolean;
}

interface HorizonBalance {
  balance: string;
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
}

/**
 * A Horizon balance ("10000.0000000") as an exact stroop count.
 *
 * Never through a float: `Number("0.0000003") * 1e7` is not 3, and a balance
 * that reads as one stroop off is a balance the gate can refuse for no reason
 * the user can see.
 */
function toStroops(decimal: string): string {
  const [whole, frac = ""] = decimal.split(".");
  const padded = (frac + "0000000").slice(0, 7);
  const sign = whole.startsWith("-") ? -1n : 1n;
  const magnitude =
    BigInt(whole.replace("-", "") || "0") * 10_000_000n + BigInt(padded || "0");
  return (sign * magnitude).toString();
}

/**
 * One Horizon call covers existence, XLM, the trustline and the USDC balance
 * together: the testnet asset is the classic `USDC` issued by the operator, and
 * the Soroban token is a SAC wrapping it, so the trustline *is* the balance.
 */
async function readAccount(address: string): Promise<{
  accountExists: boolean;
  xlmBalance: string | null;
  trustlineOpen: boolean;
  usdcStroops: string | null;
}> {
  const response = await fetch(
    `${network.horizonUrl}/accounts/${encodeURIComponent(address)}`,
    { cache: "no-store" },
  );

  if (response.status === 404) {
    return {
      accountExists: false,
      xlmBalance: null,
      trustlineOpen: false,
      usdcStroops: null,
    };
  }
  if (!response.ok) {
    // Not "the account does not exist" — Horizon did not answer. Saying false
    // here would send the visitor to friendbot for an account they may have.
    throw new Error(
      `Horizon returned ${response.status} for ${address}; the wallet's balances could not be read.`,
    );
  }

  const body = (await response.json()) as { balances?: HorizonBalance[] };
  const balances = body.balances ?? [];
  const native = balances.find((b) => b.asset_type === "native");
  const usdc = balances.find(
    (b) => b.asset_code === "USDC" && b.asset_issuer === USDC_ISSUER,
  );

  return {
    accountExists: true,
    xlmBalance: native ? native.balance : null,
    trustlineOpen: usdc !== undefined,
    usdcStroops: usdc ? toStroops(usdc.balance) : null,
  };
}

/**
 * The auditor's book: registered, the minimum, and the split between capital
 * that is free and capital already standing behind a certificate.
 *
 * Degraded as a block. A half-read book would let the UI offer an allocation
 * bounded by a number nobody read.
 */
async function readAuditor(
  address: string,
): Promise<WalletFacts["auditor"] | null> {
  try {
    const staking = new AuditorStakingClient({
      contractId: contracts.auditorStaking,
      networkPassphrase: network.passphrase,
      rpcUrl: network.rpcUrl,
      publicKey: readSource,
    });
    const [registered, minStake, freeStake, allocated] = await Promise.all([
      staking.is_registered({ auditor: address }).then((r) => r.result),
      staking.get_min_stake().then((r) => r.result),
      staking.get_free_stake({ auditor: address }).then((r) => r.result),
      staking.get_allocated({ auditor: address }).then((r) => r.result),
    ]);
    return {
      registered,
      minStakeStroops: minStake.toString(),
      freeStakeStroops: freeStake.toString(),
      allocatedStroops: allocated.toString(),
    };
  } catch {
    return null;
  }
}

export async function readWalletFacts(address: string): Promise<WalletFacts> {
  const [account, auditor] = await Promise.all([
    readAccount(address),
    readAuditor(address),
  ]);
  return {
    address,
    ...account,
    auditor,
    isDemoAuditor: address === DEMO_AUDITOR,
  };
}

/** `G…` account ids only. Contract ids and muxed addresses are not wallets. */
export function isWalletAddress(value: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(value);
}
