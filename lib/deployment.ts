/**
 * The committed deployment record — addresses only, no network, no secrets.
 *
 * Safe on both sides of the wire. `@bound/sdk`'s main entry constructs clients
 * and reads `STELLAR_NETWORK` at module scope, so it can only ever be imported
 * from a server module; the `deployments` subpath is a frozen JSON object with
 * no imports at all, which is what lets a Client Component name the demo
 * auditor without dragging Horizon into the browser bundle.
 *
 * Every address the app displays comes from here. None is written by hand.
 */
import { getDeployment, parseNetwork } from "@bound/sdk/deployments";

/**
 * Which deployment this build renders.
 *
 * `NEXT_PUBLIC_` because the browser needs it too, and Next bakes it in at
 * build time — so the answer is fixed per deployment rather than per request,
 * which is what a set of addresses has to be. Unset means `testnet`, the
 * self-issued demo token this app has always pointed at; `testnet-anchor` is
 * the same protocol denominated in the SEP-24 anchor's USDC, where a reserve
 * holds money that crossed a fiat rail to get there.
 *
 * The server half selects separately, through `STELLAR_NETWORK`. `lib/bound.ts`
 * refuses to start if the two disagree.
 */
export const deployment = getDeployment(
  parseNetwork(process.env.NEXT_PUBLIC_STELLAR_NETWORK),
);

/**
 * boundprotocol.dev's own auditor account.
 *
 * Public by design: it is in the SDK's committed deployment record and it has
 * attested certificates on testnet already. Wherever it appears as a
 * certificate's auditor, the app says whose it is — see `demo-auditor-note`.
 */
export const DEMO_AUDITOR = deployment.accounts.auditor;

/**
 * Who issues the USDC this deployment is denominated in — the asset a wallet
 * opens a trustline to.
 *
 * Read from the record rather than assumed to be the operator. The operator
 * issues the mock token and nothing else: on the anchor deployment this is the
 * anchor, and deriving it from `accounts.operator` would look up every balance
 * under an issuer no trustline names, reading zero for a funded wallet.
 */
export const USDC_ISSUER = deployment.usdcIssuer;

export const HORIZON_URL = deployment.horizonUrl;
