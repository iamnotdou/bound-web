/**
 * SERVER ONLY. Plain JSON-RPC to NEAR testnet over fetch.
 *
 * No wallet, no key, no SDK client: every call here is a read anyone can
 * make, which is the point of the read-only path. Endpoints are FastNEAR
 * (rpc.testnet.near.org answers -429 "deprecated" since 2026-11). Transaction
 * lookups go to the archival node first, because a regular node forgets a
 * transaction after a few epochs and the demo runs predate judging.
 */
import { decodeCallResult, type AccessKey } from "./format";

const RPC = [
  "https://test.rpc.fastnear.com",
  "https://rpc.testnet.fastnear.com",
];
// archival-rpc.testnet.near.org answers -429 "deprecated" like its regular
// sibling. When the FastNEAR archival node rate-limits this server, the
// regular nodes still answer for transactions younger than about 2.5 days.
const ARCHIVAL = ["https://archival-rpc.testnet.fastnear.com", ...RPC];

export class RpcError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "RpcError";
  }
}

/** A node-level answer that is really "busy, ask again later". */
function isRateLimit(err: { code?: number; message?: string; name?: string }) {
  const text = `${err.name ?? ""} ${err.message ?? ""}`.toLowerCase();
  return (
    err.code === -429 ||
    text.includes("rate limit") ||
    text.includes("too many")
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * One JSON-RPC call. Each pass asks every node in order; an outage, a timeout
 * or a rate limit moves on to the next node, and after a full pass with no
 * answer it waits (0.5 s, then 1.5 s) and tries again. A real node answer
 * (unknown tx, unknown account) is returned at once as an RpcError.
 */
async function rpc<T>(
  method: string,
  params: unknown,
  urls: string[] = RPC,
  cache: { revalidate: number } | "no-store" = { revalidate: 15 },
): Promise<T> {
  let last: unknown;
  for (const [pass, wait] of [0, 500, 1500].entries()) {
    if (pass > 0) await sleep(wait);
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: "bound-web",
            method,
            params,
          }),
          ...(cache === "no-store"
            ? { cache: "no-store" as const }
            : { next: { revalidate: cache.revalidate } }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) throw new RpcError(`${url} answered HTTP ${res.status}`);
        const body = (await res.json()) as {
          result?: T & { error?: string };
          error?: {
            code?: number;
            name?: string;
            message?: string;
            data?: unknown;
            cause?: { name?: string };
          };
        };
        if (body.error) {
          if (isRateLimit(body.error)) {
            throw new RpcError(`${url} rate limited`);
          }
          // A node-level error (unknown tx, unknown account) is an answer,
          // not an outage: do not ask the next node the same question.
          throw new RpcError(
            `${body.error.cause?.name ?? body.error.message ?? "RPC error"}`,
            body.error,
          );
        }
        if (body.result && typeof body.result.error === "string") {
          throw new RpcError(body.result.error);
        }
        return body.result as T;
      } catch (e) {
        last = e;
        if (e instanceof RpcError && e.cause) throw e;
      }
    }
  }
  throw last instanceof Error ? last : new RpcError(String(last));
}

export async function viewFunction<T>(
  contractId: string,
  method: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const r = await rpc<{ result: number[] }>("query", {
    request_type: "call_function",
    finality: "final",
    account_id: contractId,
    method_name: method,
    args_base64: Buffer.from(JSON.stringify(args)).toString("base64"),
  });
  return decodeCallResult<T>(r.result);
}

export interface AccountView {
  amount: string;
  code_hash: string;
  storage_usage: number;
  /** Set when the account uses a global contract by hash. */
  global_contract_hash?: string | null;
  /** Set when the account uses a global contract by publisher account. */
  global_contract_account_id?: string | null;
}

export function viewAccount(accountId: string): Promise<AccountView> {
  return rpc<AccountView>("query", {
    request_type: "view_account",
    finality: "final",
    account_id: accountId,
  });
}

export async function viewAccessKeys(accountId: string): Promise<AccessKey[]> {
  const r = await rpc<{ keys: AccessKey[] }>("query", {
    request_type: "view_access_key_list",
    finality: "final",
    account_id: accountId,
  });
  return r.keys;
}

export interface TxStatus {
  hash: string;
  found: boolean;
  /** True on SuccessValue, false on Failure; null when not found. */
  succeeded: boolean | null;
  blockHash: string | null;
  error: string | null;
}

/**
 * Final statuses already seen by this server process. A final transaction
 * never changes, so only answers are kept; a lookup that got no answer is
 * asked again on the next page load instead of being cached.
 */
const finalTx = new Map<string, TxStatus>();

/** One transaction's final status; archival first. Never throws. */
export async function txStatus(
  hash: string,
  sender: string,
): Promise<TxStatus> {
  const seen = finalTx.get(hash);
  if (seen) return seen;
  try {
    const r = await rpc<{
      status: Record<string, unknown>;
      transaction_outcome?: { block_hash?: string };
    }>(
      "tx",
      { tx_hash: hash, sender_account_id: sender, wait_until: "NONE" },
      ARCHIVAL,
      "no-store",
    );
    const status: TxStatus = {
      hash,
      found: true,
      succeeded: "SuccessValue" in r.status,
      blockHash: r.transaction_outcome?.block_hash ?? null,
      error: null,
    };
    finalTx.set(hash, status);
    return status;
  } catch (e) {
    return {
      hash,
      found: false,
      succeeded: null,
      blockHash: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
