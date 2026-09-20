/**
 * The fiat boundary: SEP-1 discovery, SEP-10 authentication, and a transfer
 * over whichever of SEP-24 or SEP-6 the anchor actually offers.
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
  /**
   * `TRANSFER_SERVER_SEP0024` — the interactive rail, where the anchor hosts
   * the form. Null when this anchor does not offer one.
   */
  sep24Endpoint: string | null;
  /**
   * `TRANSFER_SERVER` — the programmatic SEP-6 rail, where the anchor answers
   * with bank instructions instead of a page. Null when it offers none.
   *
   * A Turkish anchor is the reason this is here rather than hypothetical: the
   * TRY ramps that exist speak SEP-6, so an app that can only do SEP-24 cannot
   * reach the one asset this protocol most needs at the boundary.
   */
  sep6Endpoint: string | null;
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
    // A trailing `# comment` after the header is legal TOML. Without allowing
    // it the block is not split off, its fields are read from the previous
    // block, and the asset silently vanishes from `currencies`.
    .split(/^\s*\[\[CURRENCIES\]\]\s*(?:#.*)?$/m)
    .slice(1)
    .map((block): AnchorCurrency | null => {
      const code = block.match(/^\s*code\s*=\s*"([^"]*)"/m)?.[1];
      const issuer = block.match(/^\s*issuer\s*=\s*"([^"]*)"/m)?.[1];
      return code ? (issuer ? { code, issuer } : { code }) : null;
    })
    .filter((c): c is AnchorCurrency => c !== null);

  const webAuthEndpoint = scalar("WEB_AUTH_ENDPOINT");
  const sep24Endpoint = scalar("TRANSFER_SERVER_SEP0024");
  const sep6Endpoint = scalar("TRANSFER_SERVER");
  const signingKey = scalar("SIGNING_KEY");
  const networkPassphrase = scalar("NETWORK_PASSPHRASE");

  const missing = Object.entries({
    WEB_AUTH_ENDPOINT: webAuthEndpoint,
    SIGNING_KEY: signingKey,
    NETWORK_PASSPHRASE: networkPassphrase,
  })
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new AnchorUnreachable(
      `its stellar.toml is missing ${missing.join(", ")}. An anchor without these cannot do SEP-10.`,
    );
  }

  // Either rail will do, and neither is required by name — which is the point.
  // Demanding SEP-24 specifically would make "the anchor is configuration" true
  // only of anchors that happen to host a form.
  if (!sep24Endpoint && !sep6Endpoint) {
    throw new AnchorUnreachable(
      "its stellar.toml declares neither TRANSFER_SERVER_SEP0024 (SEP-24) nor TRANSFER_SERVER (SEP-6), so it offers no way to move money at all.",
    );
  }

  return {
    webAuthEndpoint: webAuthEndpoint!,
    sep24Endpoint,
    sep6Endpoint,
    signingKey: signingKey!,
    networkPassphrase: networkPassphrase!,
    currencies,
  };
}

/** Which of the two transfer protocols an anchor is talked to over. */
export type TransferProtocol = "sep24" | "sep6";

/**
 * Pick the rail.
 *
 * SEP-24 wins when an anchor offers both, because the anchor's own hosted form
 * is the safer place for it to collect identity documents than any field list
 * we would render for it. SEP-6 is what an anchor gets when it has no form —
 * the TRY ramps do not — and it is not a downgrade: the flow is the same money
 * over a programmatic API instead of a popup.
 */
export function transferProtocol(toml: AnchorToml): TransferProtocol {
  return toml.sep24Endpoint !== null ? "sep24" : "sep6";
}

/** The base URL of whichever rail {@link transferProtocol} chose. */
export function transferEndpoint(toml: AnchorToml): string {
  const endpoint = toml.sep24Endpoint ?? toml.sep6Endpoint;
  if (endpoint === null) {
    // Unreachable through `parseStellarToml`, which refuses a toml with
    // neither. Stated anyway, because the invariant lives in another function.
    throw new AnchorUnreachable("this anchor declares no transfer server");
  }
  return endpoint;
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
  /** Which rail this anchor is talked to over. The UI says so out loud. */
  protocol: TransferProtocol;
  assetCode: string;
  issuer: string | null;
  deposit: TransferLimits;
  withdraw: TransferLimits;
}

/**
 * The `/info` wire shape, which SEP-24 and SEP-6 share where it matters: both
 * key `deposit` and `withdraw` by asset code and state `enabled` inside. SEP-6
 * adds fields this app does not need and may state no limits at all, which
 * `readLimits` already renders as "not stated" rather than as zero.
 */
interface TransferInfoResponse {
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
  const info = await getJson<TransferInfoResponse>(
    `${transferEndpoint(toml)}/info`,
  );
  return {
    homeDomain: ANCHOR_HOME_DOMAIN,
    protocol: transferProtocol(toml),
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
 * The value SEP-10 requires in the challenge's `web_auth_domain` operation: the
 * **host of `WEB_AUTH_ENDPOINT`**, which is not necessarily the home domain.
 *
 * They coincide on the reference anchor (`testanchor.stellar.org` serves auth at
 * `/auth` on itself), which is exactly how passing the home domain here looked
 * correct. An anchor that splits them — `home_domain=anchor.example` with
 * `WEB_AUTH_ENDPOINT=https://api.anchor.example/auth`, a common arrangement —
 * would have had every challenge rejected, defeating the one property this
 * module is built for: that swapping anchors is configuration.
 */
export function webAuthDomain(toml: AnchorToml): string {
  return new URL(toml.webAuthEndpoint).host;
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
      webAuthDomain(toml),
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

/**
 * What starting a transfer gives you, on either rail.
 *
 * One shape with nullable halves rather than a union, because every caller —
 * route, hook, panel — has to handle both anyway, and a union would push a
 * discriminant check into three files to save a null check in one. `protocol`
 * still says which rail answered, so nothing has to infer it from which fields
 * came back non-null.
 */
export interface StartedTransfer {
  protocol: TransferProtocol;
  id: string;
  /** SEP-24: the anchor's own hosted form. Opened in a popup, never inlined. */
  url: string | null;
  /**
   * SEP-6: what the person must now do, in the anchor's own words — for a TRY
   * ramp, an IBAN and the reference to write in the transfer description.
   * Relayed verbatim and never paraphrased: this app does not know what a given
   * bank needs, and a helpfully reworded payment instruction is a lost payment.
   */
  instructions: string | null;
  /**
   * SEP-6 withdraw: where to send the asset, and the memo that tells the anchor
   * whose withdrawal it is. A withdrawal sent without the memo arrives as an
   * unattributable payment.
   */
  payTo: {
    account: string;
    memo: string | null;
    memoType: string | null;
  } | null;
  /** The anchor's own page for this transfer, when it offers one. */
  moreInfoUrl: string | null;
}

export type TransferKind = "deposit" | "withdraw";

/** SEP-6 states instructions as a field map; older anchors send a `how` string. */
function readInstructions(body: Record<string, unknown>): string | null {
  if (typeof body.how === "string" && body.how.trim() !== "") return body.how;
  const instructions = body.instructions;
  if (instructions !== null && typeof instructions === "object") {
    const lines = Object.entries(instructions as Record<string, unknown>)
      .map(([key, field]) => {
        const f = (field ?? {}) as { value?: unknown; description?: unknown };
        const label =
          typeof f.description === "string" && f.description !== ""
            ? f.description
            : key;
        return typeof f.value === "string" ? `${label}: ${f.value}` : null;
      })
      .filter((line): line is string => line !== null);
    if (lines.length > 0) return lines.join("\n");
  }
  return null;
}

/**
 * Start a transfer in either direction, over whichever rail the anchor speaks.
 *
 * Both directions share one function because they are the same call with a
 * different noun, and the product needs both: a reserve funded from fiat is
 * half a rail if a proven claim cannot be paid back out to fiat.
 *
 * The two rails differ in who does the next step. SEP-24 hands back a URL and
 * the person finishes inside the anchor's window. SEP-6 hands back instructions
 * and the person goes to their bank — no page, no popup, and nothing for this
 * app to host on the anchor's behalf.
 */
export async function startTransfer(
  kind: TransferKind,
  token: string,
  params: { account: string; amount?: string },
): Promise<StartedTransfer> {
  const toml = await anchorToml();
  const protocol = transferProtocol(toml);
  const authorization = `Bearer ${token}`;

  if (protocol === "sep24") {
    const body: Record<string, string> = {
      asset_code: ANCHOR_ASSET_CODE,
      account: params.account,
    };
    if (params.amount) body.amount = params.amount;

    const result = await getJson<{ id: string; url: string }>(
      `${toml.sep24Endpoint}/transactions/${kind}/interactive`,
      {
        method: "POST",
        headers: { "content-type": "application/json", authorization },
        body: JSON.stringify(body),
      },
    );
    return {
      protocol,
      id: result.id,
      url: result.url,
      instructions: null,
      payTo: null,
      moreInfoUrl: null,
    };
  }

  // SEP-6 is a GET with query parameters, and `type` says how the money
  // travels off-chain. `bank_account` is the only funding method a Turkish
  // ramp offers, and asking for one the anchor does not list is an error
  // rather than a fallback.
  const query = new URLSearchParams({
    asset_code: ANCHOR_ASSET_CODE,
    type: "bank_account",
  });
  if (kind === "deposit") query.set("account", params.account);
  if (params.amount) query.set("amount", params.amount);

  const result = await getJson<Record<string, unknown>>(
    `${toml.sep6Endpoint}/${kind}?${query.toString()}`,
    { headers: { authorization } },
  );

  const account = result.account_id;
  return {
    protocol,
    id: String(result.id ?? ""),
    url: null,
    instructions: readInstructions(result),
    payTo:
      typeof account === "string"
        ? {
            account,
            memo: typeof result.memo === "string" ? result.memo : null,
            memoType:
              typeof result.memo_type === "string" ? result.memo_type : null,
          }
        : null,
    moreInfoUrl:
      typeof result.more_info_url === "string" ? result.more_info_url : null,
  };
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
  }>(`${transferEndpoint(toml)}/transaction?id=${encodeURIComponent(id)}`, {
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
