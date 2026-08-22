/**
 * M2's acceptance: the app tells a wallet what it may do before it signs.
 *
 * Runs against a dev server (`pnpm dev`) and live testnet. Nothing here signs
 * or submits anything — every assertion is a read, and the one build it asks
 * for is expected to be refused.
 *
 *   BASE_URL=http://localhost:3000 pnpm exec tsx scripts/check-gates.ts
 */
import { spawnSync } from "node:child_process";
import { Keypair } from "@stellar/stellar-sdk";
import { accounts } from "@bound/sdk";
import type { ActionKey, Gate } from "@/lib/preconditions";
import type { WalletFacts } from "@/lib/wallet-facts";
import { check, crashed, equals, fail, finish, note, section } from "./report";

const baseUrl = (
  process.env.BASE_URL ??
  process.argv.find((a) => a.startsWith("--base-url="))?.slice(11) ??
  "http://localhost:3000"
).replace(/\/$/, "");

interface WalletResponse {
  facts: WalletFacts;
  certId: number | null;
  gates: Record<ActionKey, Gate>;
}

async function readWallet(
  address: string,
  certId?: number,
): Promise<WalletResponse> {
  const query = certId === undefined ? "" : `?certId=${certId}`;
  const response = await fetch(`${baseUrl}/api/wallet/${address}${query}`);
  if (!response.ok) {
    throw new Error(
      `GET /api/wallet/${address}${query} → ${response.status} ${await response.text()}`,
    );
  }
  return (await response.json()) as WalletResponse;
}

function codeOf(gate: Gate): string {
  return gate.ok ? "ok" : gate.code;
}

async function main() {
  section(`Gates against ${baseUrl}`);

  // ── The demo auditor cannot attest a certificate with an empty vault ─────
  try {
    const { facts, gates } = await readWallet(accounts.auditor, 2);
    equals("demo auditor is recognised as such", facts.isDemoAuditor, true);
    equals("demo auditor is registered", facts.auditor?.registered, true);
    equals(
      "attest on cert #2 (vault empty)",
      codeOf(gates.attest),
      "reserve-unfunded",
    );
    check(
      "the refusal names both figures",
      !gates.attest.ok && /\$0/.test(gates.attest.reason),
      !gates.attest.ok ? gates.attest.reason : "gate was open",
    );
  } catch (error) {
    crashed("demo auditor / cert #2", error);
  }

  // ── An address with no account is sent to fund it, not to a dead end ─────
  try {
    const fresh = Keypair.random().publicKey();
    const { facts, gates } = await readWallet(fresh);
    equals("a fresh keypair has no account", facts.accountExists, false);
    equals("its XLM balance is unknown, not zero", facts.xlmBalance, null);
    equals("its USDC balance is unknown, not zero", facts.usdcStroops, null);
    equals("stake", codeOf(gates.stake), "no-account");
    equals("publish", codeOf(gates.publish), "no-account");
    equals(
      "faucet is still open to it — that is what the faucet is for",
      codeOf(gates.faucet),
      "ok",
    );
  } catch (error) {
    crashed("fresh keypair", error);
  }

  // ── A funded reserve has nothing left to fund ────────────────────────────
  try {
    const { gates } = await readWallet(accounts.operator, 1);
    equals("fund on cert #1", codeOf(gates.fund), "already-funded");
  } catch (error) {
    crashed("operator / cert #1", error);
  }

  // ── …and the same wallet on an empty one is allowed to ──────────────────
  try {
    const { gates } = await readWallet(accounts.operator, 2);
    equals("fund on cert #2 as its operator", codeOf(gates.fund), "ok");
  } catch (error) {
    crashed("operator / cert #2", error);
  }

  // ── A wallet that is not the operator is told so before it signs ────────
  try {
    const { gates } = await readWallet(accounts.challenger, 2);
    equals("fund on cert #2 as a stranger", codeOf(gates.fund), "not-operator");
  } catch (error) {
    crashed("challenger / cert #2", error);
  }

  // ── An unknown address is a 400, not an invented set of facts ───────────
  try {
    const response = await fetch(`${baseUrl}/api/wallet/not-an-address`);
    equals("GET /api/wallet/not-an-address", response.status, 400);
    const cacheControl = (
      await fetch(`${baseUrl}/api/wallet/${accounts.operator}`)
    ).headers.get("cache-control");
    check(
      "the wallet endpoint is never cached",
      cacheControl !== null && /no-store/.test(cacheControl),
      `cache-control: ${cacheControl}`,
    );
  } catch (error) {
    crashed("wallet endpoint hygiene", error);
  }

  // ── The build route refuses what the gate said it would, in the same
  //    words, rather than handing back an envelope that cannot land ────────
  try {
    const response = await fetch(`${baseUrl}/api/tx/build`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "attest",
        address: accounts.auditor,
        params: { certId: 2, allocationUsd: 500 },
      }),
    });
    const body = (await response.json()) as {
      xdr?: string;
      error?: string;
      code?: string;
      raw?: string;
    };
    equals("POST /api/tx/build attest cert #2", response.status, 400);
    equals("no envelope was returned", body.xdr, undefined);
    equals(
      "the failure carries the same code as the gate",
      body.code,
      "reserve-unfunded",
    );
    check(
      "the raw chain error is kept alongside the sentence",
      typeof body.raw === "string" && body.raw.includes("HostError"),
      (body.raw ?? "<none>").slice(0, 60),
    );
  } catch (error) {
    crashed("build route translation", error);
  }

  // ── A build that should work still does ─────────────────────────────────
  try {
    const response = await fetch(`${baseUrl}/api/tx/build`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "stake",
        address: accounts.auditor,
        params: { amountUsd: 1 },
      }),
    });
    const body = (await response.json()) as { xdr?: string; error?: string };
    equals("POST /api/tx/build stake", response.status, 200);
    check(
      "an envelope came back",
      typeof body.xdr === "string" && body.xdr.length > 100,
      body.error ?? `${(body.xdr ?? "").length} chars`,
    );
  } catch (error) {
    crashed("build route happy path", error);
  }

  // ── Every GateCode is exercised by a vitest case ────────────────────────
  section("Gate coverage (vitest)");
  // The coverage case tallies what every other case in the file produced, so
  // the whole file has to run. Filtering to the one test would make it pass by
  // running nothing and finding nothing missing — a green tick for an empty
  // tally, which is the exact shape of assertion this project exists to avoid.
  const vitest = spawnSync(
    "pnpm",
    ["exec", "vitest", "run", "lib/preconditions.test.ts"],
    { encoding: "utf8" },
  );
  if (vitest.status === 0) {
    equals(
      "lib/preconditions.test.ts (incl. the GateCode coverage case)",
      vitest.status,
      0,
    );
  } else {
    fail(
      "lib/preconditions.test.ts (incl. the GateCode coverage case)",
      (vitest.stdout ?? "") + (vitest.stderr ?? ""),
    );
  }

  note(`checked against ${baseUrl}`);
  finish();
}

main().catch((error) => {
  fail(
    "check-gates",
    error instanceof Error ? (error.stack ?? error.message) : String(error),
  );
  finish();
});
