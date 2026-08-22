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
import { getDeployment } from "@bound/sdk/deployments";

export const deployment = getDeployment("testnet");

/**
 * boundprotocol.dev's own auditor account.
 *
 * Public by design: it is in the SDK's committed deployment record and it has
 * attested certificates on testnet already. Wherever it appears as a
 * certificate's auditor, the app says whose it is — see `demo-auditor-note`.
 */
export const DEMO_AUDITOR = deployment.accounts.auditor;

/** The USDC issuer for the testnet asset a wallet opens a trustline to. */
export const USDC_ISSUER = deployment.accounts.operator;

export const HORIZON_URL = deployment.horizonUrl;
