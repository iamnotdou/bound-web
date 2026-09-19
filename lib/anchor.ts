/**
 * The fiat boundary: SEP-1 discovery, SEP-10 authentication, SEP-24 transfer.
 *
 * SERVER ONLY. It reaches a third-party anchor over HTTP. It holds no key — the
 * connected wallet signs the SEP-10 challenge, exactly the way it signs a
 * contract invocation, so this module grants no authority it did not receive
 * from the signer.
 *
 * Nothing here names an endpoint. The anchor is one environment variable
 * (`ANCHOR_HOME_DOMAIN`) and every URL is read out of its `stellar.toml`, which
 * is what SEP-1 exists for. That is not ceremony: the asset this protocol wants
 * at the boundary is a Turkish lira one, the anchor that issues it is not the
 * anchor we develop against, and the difference between those two must be a
 * config change rather than a diff.
 */
import { WebAuth } from "@stellar/stellar-sdk";
import { readLimits, type TransferLimits } from "./anchor-limits";

/**
 * The anchor to talk to. Defaults to the SDF reference anchor, which is the one
 * that exists on testnet and which issues the USDC the contracts can be
 * deployed against.
 */
export const ANCHOR_HOME_DOMAIN =
  process.env.ANCHOR_HOME_DOMAIN?.trim() || "testanchor.stellar.org";

/** The asset moved across the boundary. A TRY anchor would set this to TRY. */
export const ANCHOR_ASSET_CODE =
  process.env.ANCHOR_ASSET_CODE?.trim() || "USDC";

export class AnchorUnreachable extends Error {
  constructor(detail: string) {
    super(
      `The anchor at ${ANCHOR_HOME_DOMAIN} could not be reached: ${detail}`,
    );
    this.name = "AnchorUnreachable";
  }
}

export interface AnchorCurrency {
  code: string;
  issuer?: string;
}

export interface AnchorToml {
  webAuthEndpoint: string;
  sep24Endpoint: string;
  /** The account whose signature makes a SEP-10 challenge authentic. */
  signingKey: string;
  networkPassphrase: string;
  currencies: AnchorCurrency[];
}

/**
 * Read the five `stellar.toml` values SEP-10 and SEP-24 need.
 *
 * Deliberately **not** a TOML parser. A general parser is a dependency and a
 * class of bug; this reads five known keys and the `[[CURRENCIES]]` blocks by
 * pattern, and returns null for anything it cannot find so the caller reports a
 * missing key by name rather than crashing on `undefined` three calls later.
 *
 * Pure — no network, no environment. The fixture-driven tests are the reason it
 * is shaped this way.
 */
export function parseStellarToml(text: string): AnchorToml {
  const scalar = (key: string): string | null => {
    const match = text.match(new RegExp(`^\\s*${key}\\s*=\\s*"([^"]*)"`, "m"));
    return match ? match[1] : null;
  };

  const currencies = text
    .split(/^\s*\[\[CURRENCIES\]\]\s*$/m)
    .slice(1)
    .map((block): AnchorCurrency | null => {
      const code = block.match(/^\s*code\s*=\s*"([^"]*)"/m)?.[1];
      const issuer = block.match(/^\s*issuer\s*=\s*"([^"]*)"/m)?.[1];
      return code ? (issuer ? { code, issuer } : { code }) : null;
    })
    .filter((c): c is AnchorCurrency => c !== null);

  const webAuthEndpoint = scalar("WEB_AUTH_ENDPOINT");
  const sep24Endpoint = scalar("TRANSFER_SERVER_SEP0024");
  const signingKey = scalar("SIGNING_KEY");
  const networkPassphrase = scalar("NETWORK_PASSPHRASE");

  const missing = Object.entries({
    WEB_AUTH_ENDPOINT: webAuthEndpoint,
    TRANSFER_SERVER_SEP0024: sep24Endpoint,
    SIGNING_KEY: signingKey,
    NETWORK_PASSPHRASE: networkPassphrase,
  })
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new AnchorUnreachable(
      `its stellar.toml is missing ${missing.join(", ")}. An anchor without these cannot do SEP-10 or SEP-24.`,
    );
  }

  return {
    webAuthEndpoint: webAuthEndpoint!,
    sep24Endpoint: sep24Endpoint!,
    signingKey: signingKey!,
    networkPassphrase: networkPassphrase!,
    currencies,
  };
}

/** The issuer of `code`, as the anchor's own toml declares it. */
export function issuerOf(toml: AnchorToml, code: string): string | null {
  return toml.currencies.find((c) => c.code === code)?.issuer ?? null;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, cache: "no-store" });
  } catch (cause) {
    throw new AnchorUnreachable(
      cause instanceof Error ? cause.message : String(cause),
    );
  }
  if (!response.ok) {
    throw new AnchorUnreachable(
      `${url} returned ${response.status} ${await response.text().catch(() => "")}`.trim(),
    );
  }
  return (await response.json()) as T;
}

/**
 * How long a fetched `stellar.toml` is reused.
 *
 * A cached toml is a cached SIGNING_KEY, and every SEP-10 challenge is
 * validated against it — so an anchor that rotates its key must not keep being
 * checked against the old one for the life of the process. Sixty seconds bounds
 * that window to something shorter than any key rotation, while stopping the
 * five call sites below from refetching on every poll: the transfer poller runs
 * every five seconds, so uncached this hit a third party's well-known endpoint
 * twelve times a minute per open page, which is both wasteful and rude.
 */
const TOML_TTL_MS = 60_000;

let cachedToml: { at: number; domain: string; value: AnchorToml } | null = null;

/**
 * The anchor's SEP-1 record, cached for {@link TOML_TTL_MS}.
 *
 * Keyed by home domain as well as time, so changing `ANCHOR_HOME_DOMAIN` can
 * never be served a previous anchor's endpoints and signing key.
 */
export async function anchorToml(): Promise<AnchorToml> {
  if (
    cachedToml !== null &&
    cachedToml.domain === ANCHOR_HOME_DOMAIN &&
    Date.now() - cachedToml.at < TOML_TTL_MS
  ) {
    return cachedToml.value;
  }

  const url = `https://${ANCHOR_HOME_DOMAIN}/.well-known/stellar.toml`;
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch (cause) {
    throw new AnchorUnreachable(
      cause instanceof Error ? cause.message : String(cause),
    );
  }
  if (!response.ok) {
    throw new AnchorUnreachable(`${url} returned ${response.status}`);
  }

  const value = parseStellarToml(await response.text());
  // Cached only after parsing succeeds: a malformed toml must be re-fetched
  // next time rather than remembered as the answer for a minute.
  cachedToml = { at: Date.now(), domain: ANCHOR_HOME_DOMAIN, value };
  return value;
}

/** Drop the cached record. For tests, and for a deliberate re-read. */
export function forgetAnchorToml(): void {
  cachedToml = null;
}

export type { TransferLimits } from "./anchor-limits";
export { readLimits, amountRefusal } from "./anchor-limits";

export interface AnchorInfo {
  homeDomain: string;
  assetCode: string;
  issuer: string | null;
  deposit: TransferLimits;
  withdraw: TransferLimits;
}

/** The `/sep24/info` wire shape. Describes the protocol, not the arithmetic. */
interface Sep24InfoResponse {
  deposit?: Record<
    string,
    { enabled?: boolean; min_amount?: number; max_amount?: number }
  >;
  withdraw?: Record<
    string,
    { enabled?: boolean; min_amount?: number; max_amount?: number }
  >;
}

/**
 * What the anchor will actually do, read live.
 *
 * The limits matter more here than they look. The reference anchor caps a
 * single transfer at 10 units, and Bound's economics are written in hundreds —
 * a minimum auditor stake of $500 cannot be reached through a rail that moves
 * $10 at a time. Surfacing the cap is how that becomes a stated constraint
 * instead of a demo that stalls.
 */
export async function anchorInfo(): Promise<AnchorInfo> {
  const toml = await anchorToml();
  const info = await getJson<Sep24InfoResponse>(`${toml.sep24Endpoint}/info`);
  return {
    homeDomain: ANCHOR_HOME_DOMAIN,
    assetCode: ANCHOR_ASSET_CODE,
    issuer: issuerOf(toml, ANCHOR_ASSET_CODE),
    deposit: readLimits(info.deposit, ANCHOR_ASSET_CODE),
    withdraw: readLimits(info.withdraw, ANCHOR_ASSET_CODE),
  };
}

export interface Challenge {
  xdr: string;
  networkPassphrase: string;
}

/**
 * Fetch a SEP-10 challenge and **prove it is safe to sign** before handing it
 * to a wallet.
 *
 * This is the anchor-side counterpart of `assertSignableXdr`. We are about to
 * ask somebody to sign a transaction we fetched from a third party, so the
 * question is not "did the anchor answer" but "is what it answered actually a
 * SEP-10 challenge". `WebAuth.readChallengeTx` is what settles it: sequence
 * number zero, source account equal to the anchor's declared SIGNING_KEY, the
 * home-domain `manageData` operation, a matching web-auth domain, and the
 * anchor's own signature already present and valid.
 *
 * Skip it and a hostile or compromised anchor hands back a payment operation,
 * the wallet shows an approval dialog the user has been trained to accept, and
 * the account is drained by the one step in this flow that was supposed to be
 * free.
 */
export async function sep10Challenge(address: string): Promise<Challenge> {
  const toml = await anchorToml();

  const { transaction, network_passphrase } = await getJson<{
    transaction: string;
    network_passphrase?: string;
  }>(
    `${toml.webAuthEndpoint}?account=${encodeURIComponent(address)}&home_domain=${encodeURIComponent(ANCHOR_HOME_DOMAIN)}`,
  );

  const passphrase = network_passphrase ?? toml.networkPassphrase;

  let read: ReturnType<typeof WebAuth.readChallengeTx>;
  try {
    read = WebAuth.readChallengeTx(
      transaction,
      toml.signingKey,
      passphrase,
      [ANCHOR_HOME_DOMAIN],
      ANCHOR_HOME_DOMAIN,
    );
  } catch (cause) {
    throw new Error(
      `The anchor returned something that is not a valid SEP-10 challenge, so it was not shown to your wallet: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    );
  }

  if (read.clientAccountID !== address) {
    // A challenge issued for a different account would authenticate somebody
    // else if signed. Refuse rather than sign.
    throw new Error(
      `The anchor issued a challenge for ${read.clientAccountID}, not for the connected wallet ${address}.`,
    );
  }

  return { xdr: transaction, networkPassphrase: passphrase };
}

/**
 * Exchange a wallet-signed challenge for the anchor's session token.
 *
 * The token is returned to the caller rather than held here. It authenticates
 * one account at one anchor, that account is the person holding the browser,
 * and this app keeps no session store to put it in — so the honest options were
 * "hand it back" or "invent server state". The route that receives it says
 * plainly that it must live in memory and never in storage.
 */
export async function sep10Token(signedXdr: string): Promise<string> {
  const toml = await anchorToml();
  const { token } = await getJson<{ token: string }>(toml.webAuthEndpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ transaction: signedXdr }),
  });
  if (!token) throw new AnchorUnreachable("no token in the SEP-10 response");
  return token;
}

export interface InteractiveTransfer {
  id: string;
  /** The anchor's own hosted form. Opened in a popup, never inlined. */
  url: string;
}

export type TransferKind = "deposit" | "withdraw";

/**
 * Open a SEP-24 interactive transfer and return the anchor's hosted URL.
 *
 * Both directions go through here because they are the same call with a
 * different noun, and the product needs both: a reserve funded from fiat is
 * only half a rail if a proven claim cannot be paid back out to fiat.
 */
export async function startTransfer(
  kind: TransferKind,
  token: string,
  params: { account: string; amount?: string },
): Promise<InteractiveTransfer> {
  const toml = await anchorToml();
  const body: Record<string, string> = {
    asset_code: ANCHOR_ASSET_CODE,
    account: params.account,
  };
  if (params.amount) body.amount = params.amount;

  const result = await getJson<{ id: string; url: string }>(
    `${toml.sep24Endpoint}/transactions/${kind}/interactive`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    },
  );
  return { id: result.id, url: result.url };
}

export interface AnchorTransaction {
  id: string;
  kind: string;
  status: string;
  amountIn: string | null;
  amountOut: string | null;
  /** Set once the anchor has actually moved the money on-chain. */
  stellarTransactionId: string | null;
  message: string | null;
}

/** Poll one transfer. Read-only: no signature, no fee, no state change. */
export async function readTransfer(
  token: string,
  id: string,
): Promise<AnchorTransaction> {
  const toml = await anchorToml();
  const { transaction } = await getJson<{
    transaction: Record<string, string | null>;
  }>(`${toml.sep24Endpoint}/transaction?id=${encodeURIComponent(id)}`, {
    headers: { authorization: `Bearer ${token}` },
  });

  return {
    id: String(transaction.id ?? id),
    kind: String(transaction.kind ?? ""),
    status: String(transaction.status ?? "unknown"),
    amountIn: transaction.amount_in ?? null,
    amountOut: transaction.amount_out ?? null,
    stellarTransactionId: transaction.stellar_transaction_id ?? null,
    message: transaction.message ?? null,
  };
}

/**
 * Whether the asset this anchor delivers is the one the deployed contracts
 * actually take.
 *
 * Bound's live deployment holds a self-issued test USDC; the anchor issues its
 * own. They are different money, and until the contracts are redeployed against
 * the anchor's asset a completed deposit funds a wallet but cannot fund a
 * reserve. Every surface that offers the rail has to say which of those two it
 * is doing, because "your reserve is funded" would otherwise be false.
 */
export function assetMatchesDeployment(
  anchorIssuer: string | null,
  deploymentUsdcIssuer: string,
): boolean {
  return anchorIssuer !== null && anchorIssuer === deploymentUsdcIssuer;
}
