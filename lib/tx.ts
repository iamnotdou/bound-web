/**
 * SERVER ONLY. The write path's single door onto `@bound/sdk`.
 *
 * Like `lib/bound.ts`, everything here reaches Soroban RPC and reads
 * `STELLAR_NETWORK`, so it must never be pulled into a client bundle — it is
 * imported by route handlers only. No secret key is used anywhere in this file:
 * the connected wallet is both the transaction source and the `require_auth`
 * address, so the envelope it signs is complete on its own.
 */
import {
  buildActionXdr,
  buildTrustlineXdr,
  submitSignedXdr,
  network,
  readSource,
  contracts,
  ChallengeManagerClient,
  type WalletAction,
  type BuildParams,
  type Verdict,
} from "@bound/sdk";
import { Address, TransactionBuilder, rpc } from "@stellar/stellar-sdk";

export type { WalletAction, BuildParams };

/**
 * The actions a browser is allowed to ask the server to build. Anything outside
 * this list is a 400, never a build attempt.
 */
export const WALLET_ACTIONS = [
  "stake",
  "attest",
  "publish",
  "deposit-fee",
  "pay",
  "challenge",
] as const satisfies readonly WalletAction[];

export function isWalletAction(value: unknown): value is WalletAction {
  return (
    typeof value === "string" &&
    (WALLET_ACTIONS as readonly string[]).includes(value)
  );
}

/**
 * The passphrase the wallet must sign under. It is handed back with every built
 * envelope so the browser never has to hardcode — or guess — a network.
 */
export function networkPassphrase(): string {
  return network.passphrase;
}

export { buildActionXdr, buildTrustlineXdr, submitSignedXdr };

/* ------------------------------------------------------------------ *
 * App actions
 *
 * `WALLET_ACTIONS` is typed against the SDK's own `WalletAction`, so the
 * envelopes this app needs and the SDK does not build cannot simply be added
 * to it. They get their own union instead, and one builder that delegates
 * where it can and builds locally where it cannot.
 * ------------------------------------------------------------------ */

/** Actions the SDK builds, plus the ones this app builds itself. */
export type AppAction = WalletAction | "deposit" | "trustline";

export const APP_ACTIONS = [
  ...WALLET_ACTIONS,
  "trustline",
] as const satisfies readonly AppAction[];

export function isAppAction(value: unknown): value is AppAction {
  return (
    typeof value === "string" &&
    (APP_ACTIONS as readonly string[]).includes(value)
  );
}

/** `BuildParams`, plus what the locally-built actions need. */
export interface AppBuildParams extends BuildParams {
  /** For `deposit`: the amount to move into the reserve vault, in stroops. */
  amountStroops?: string;
}

/**
 * Delegates to the SDK where it can; builds locally where it cannot.
 *
 * `trustline` is the SDK's own `buildTrustlineXdr` — a classic `changeTrust`,
 * not a Soroban invocation, which `submitSignedXdr` already routes to Horizon
 * rather than to the RPC.
 */
export async function buildAppActionXdr(
  action: AppAction,
  address: string,
  params: AppBuildParams,
): Promise<string> {
  switch (action) {
    case "trustline":
      return buildTrustlineXdr(address);
    case "deposit":
      // Lands in M4, with the ReserveVault client. Until then the action is
      // not in `APP_ACTIONS`, so the build endpoint rejects it before here.
      throw new Error("deposit is not buildable yet");
    default:
      return buildActionXdr(action, address, params);
  }
}

/**
 * Read a challenge's verdict without signing anything.
 *
 * A false claim is decided in its own filing transaction, so it comes back
 * already settled. A true one opens a 72-hour claim window and stays `Pending`
 * until someone closes it — that call is permissionless but still a transaction
 * somebody has to pay for, and this app holds no key.
 *
 * Reading the verdict back is a simulation against a funded read source — no
 * key, no fee, no state change — which lets the UI say what the chain actually
 * thinks rather than guessing which of those two happened.
 */
export async function readChallengeVerdict(
  challengeId: number,
): Promise<Verdict["tag"] | null> {
  try {
    const client = new ChallengeManagerClient({
      contractId: contracts.challengeManager,
      networkPassphrase: network.passphrase,
      rpcUrl: network.rpcUrl,
      publicKey: readSource,
    });
    const assembled = await client.get_challenge({
      challenge_id: BigInt(challengeId),
    });
    return assembled.result.verdict.tag;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * Before the wallet is asked to sign
 * ------------------------------------------------------------------ */

/**
 * Addresses this envelope needs an authorization signature from, other than
 * the wallet that would submit it.
 *
 * `ReserveVault::deposit` authenticates against `Registry::get_cert_operator`,
 * so a stranger's deposit assembles cleanly and comes back carrying an auth
 * entry addressed to the operator. Handing that envelope to a browser wallet
 * would produce a signature that cannot satisfy it — the user signs, pays a
 * fee, and the transaction fails. Reading the entries costs nothing and says
 * so first.
 */
export function requiredCosigners(signedOrUnsigned: string): string[] {
  const tx = TransactionBuilder.fromXDR(signedOrUnsigned, network.passphrase);
  if (!("operations" in tx)) return [];
  const found: string[] = [];
  for (const op of tx.operations) {
    if (op.type !== "invokeHostFunction") continue;
    for (const entry of op.auth ?? []) {
      const credentials = entry.credentials();
      if (credentials.switch().name !== "sorobanCredentialsAddress") continue;
      found.push(
        Address.fromScAddress(credentials.address().address()).toString(),
      );
    }
  }
  return found;
}

/**
 * Refuse to hand back an envelope the connected wallet cannot make succeed.
 *
 * `@bound/sdk`'s `buildActionXdr` returns `AssembledTransaction.toXDR()`, and
 * `toXDR()` serialises whatever was assembled — including an assembly whose
 * simulation failed. Verified against the deployed contracts: attesting an
 * unfunded certificate, attesting as an unregistered auditor and funding
 * someone else's reserve all produced a perfectly well-formed envelope. The
 * build route's own comment claimed the simulation caught those. It did not.
 *
 * So the envelope is simulated again here, as assembled. That re-simulation
 * carries the auth entries, which means it also fails the cases the first one
 * let through. One extra RPC round trip, in exchange for never asking somebody
 * to sign a transaction that cannot land.
 */
export async function assertSignableXdr(
  xdr: string,
  address: string,
): Promise<void> {
  const strangers = requiredCosigners(xdr).filter((a) => a !== address);
  if (strangers.length > 0) {
    throw new Error(
      `this transaction needs the signature of ${[...new Set(strangers)].join(", ")}, which the connected wallet does not hold`,
    );
  }

  const tx = TransactionBuilder.fromXDR(xdr, network.passphrase);
  if (!("operations" in tx)) return;
  const soroban = tx.operations.some((op) => op.type === "invokeHostFunction");
  // A classic `changeTrust` has nothing to simulate; Horizon validates it on
  // submit and there is no contract state to be wrong about.
  if (!soroban) return;

  const simulation = await new rpc.Server(network.rpcUrl).simulateTransaction(
    tx,
  );
  if (rpc.Api.isSimulationError(simulation)) {
    throw new Error(simulation.error);
  }
}
