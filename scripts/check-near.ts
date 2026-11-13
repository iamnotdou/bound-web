/**
 * Read-only acceptance run for the NEAR pages against a running server and
 * live NEAR testnet. Signs nothing, needs no wallet and no key.
 *
 *   pnpm dev            (or: pnpm build && pnpm start)
 *   pnpm check:near     [base url, default http://localhost:3000]
 *
 * Each claim is checked against the chain's own answer: the page must show
 * the same certificate status the contract returns for the same agent.
 */
import { check, crashed, finish, section } from "./report";
import record from "../lib/near/testnet.json";

const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const CONTRACT = record.contracts.bound.accountId;
const run = record.demoRuns.at(-1)!;

async function rpcView<T>(method: string, args: object): Promise<T> {
  const res = await fetch(record.rpc[0], {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "query",
      params: {
        request_type: "call_function",
        finality: "final",
        account_id: CONTRACT,
        method_name: method,
        args_base64: Buffer.from(JSON.stringify(args)).toString("base64"),
      },
    }),
  });
  const body = (await res.json()) as { result: { result: number[] } };
  return JSON.parse(Buffer.from(body.result.result).toString("utf8")) as T;
}

async function page(path: string): Promise<{ status: number; text: string }> {
  const res = await fetch(BASE + path);
  const html = await res.text();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<!-- -->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
  return { status: res.status, text };
}

async function main() {
  section(`NEAR pages at ${BASE} vs ${CONTRACT}`);
  const count = await rpcView<number>("cert_count", {});
  const verified = await rpcView<{ cert_id: number; status: string }>(
    "verify",
    {
      agent: run.agent2,
    },
  );
  const settled = await rpcView<{ cert_id: number; status: string }>("verify", {
    agent: run.agent,
  });

  const home = await page("/app/near");
  check("/app/near 200", home.status === 200, `status ${home.status}`);
  check(
    "lists every certificate",
    home.text.includes(`bound-agent-${run.runId}.testnet`) &&
      new RegExp(`\\b${count - 1}\\b`).test(home.text),
    `cert_count ${count}`,
  );
  check(
    "code_hash of both contracts matches the recorded build",
    (home.text.match(/matches the recorded build/g) ?? []).length === 2,
    "",
  );

  const v = await page(`/app/near?agent=${run.agent2}`);
  check(
    `verify ${run.agent2} says Deal`,
    v.text.includes(`Deal: ${run.agent2} is Verified`) &&
      verified.status === "Verified",
    `contract says ${verified.status}`,
  );
  const s = await page(`/app/near?agent=${run.agent}`);
  check(
    `verify ${run.agent} says Refuse`,
    s.text.includes(`Refuse: Certificate status is ${settled.status}`),
    `contract says ${settled.status}`,
  );

  const cert = await page(`/app/near/cert/${settled.cert_id}`);
  check(
    `/app/near/cert/${settled.cert_id} 200`,
    cert.status === 200,
    `status ${cert.status}`,
  );
  check(
    "agent key confinement shown",
    cert.text.includes("Confined: its only key"),
    "",
  );
  check(
    "settlement waterfall shown",
    cert.text.includes("Settlement (fraud)"),
    "",
  );

  const r = await page(`/app/near/run/${run.runId}`);
  const m = r.text.match(
    /(\d+) of (\d+) recorded transactions match the chain/,
  );
  check(
    `/app/near/run/${run.runId}: every recorded tx matches the chain`,
    !!m && m[1] === m[2],
    m ? `${m[1]}/${m[2]}` : "headline missing",
  );

  const api = await fetch(`${BASE}/api/near/verify/${run.agent2}`);
  const j = (await api.json()) as { deal: boolean; confinement: unknown };
  check(
    "GET /api/near/verify/<agent2> deal=true",
    api.status === 200 && j.deal,
    `status ${api.status}`,
  );
  const bad = await fetch(`${BASE}/api/near/verify/NOT..VALID`);
  check(
    "GET /api/near/verify/<bad id> 400",
    bad.status === 400,
    `status ${bad.status}`,
  );

  const missing = await page("/app/near/cert/999999");
  check(
    "unknown certificate 404",
    missing.status === 404,
    `status ${missing.status}`,
  );
  finish();
}

main().catch((e) => {
  crashed("check:near", e);
  finish();
});
