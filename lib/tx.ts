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
  submitSignedXdr,
  network,
  readSource,
  contracts,
  ChallengeManagerClient,
  type WalletAction,
  type BuildParams,
  type Verdict,
} from "@bound/sdk";

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

export { buildActionXdr, submitSignedXdr };

/**
 * Read a challenge's verdict without signing anything.
 *
 * `resolve` is permissionless but still a transaction someone has to pay for,
 * and this app holds no key, so a challenge opened here stays `Pending` until
 * someone resolves it. Reading the verdict back is a simulation against a
 * funded read source — no key, no fee, no state change — which lets the UI say
 * what the chain actually thinks rather than guessing.
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
