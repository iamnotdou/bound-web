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
const ARCHIVAL = [
  "https://archival-rpc.testnet.fastnear.com",
  "https://archival-rpc.testnet.near.org",
];

export class RpcError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "RpcError";
  }
}

async function rpc<T>(
  method: string,
  params: unknown,
  urls: string[] = RPC,
  revalidate = 15,
): Promise<T> {
  let last: unknown;
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
        next: { revalidate },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new RpcError(`${url} answered HTTP ${res.status}`);
      const body = (await res.json()) as {
        result?: T & { error?: string };
        error?: { message?: string; data?: unknown; cause?: { name?: string } };
      };
      if (body.error) {
        // A node-level error (unknown tx, unknown account) is an answer, not
        // an outage: do not ask the next node the same question.
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

/** One transaction's final status; archival first. Never throws. */
export async function txStatus(
  hash: string,
  sender: string,
): Promise<TxStatus> {
  try {
    const r = await rpc<{
      status: Record<string, unknown>;
      transaction_outcome?: { block_hash?: string };
    }>(
      "tx",
      { tx_hash: hash, sender_account_id: sender, wait_until: "NONE" },
      ARCHIVAL,
      3600,
    );
    return {
      hash,
      found: true,
      succeeded: "SuccessValue" in r.status,
      blockHash: r.transaction_outcome?.block_hash ?? null,
      error: null,
    };
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
