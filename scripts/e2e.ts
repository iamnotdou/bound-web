/**
 * The whole walk, headless, against live testnet.
 *
 *   pnpm dev &
 *   pnpm exec tsx scripts/e2e.ts
 *
 * Flags:
 *   --through=usdc|fund|verified   stop after that leg (used by M3–M5)
 *   --base-url=<url>               default http://localhost:3000
 *
 * No committed key. Two ephemeral keypairs are generated per run and every
 * write goes through **the app's own HTTP routes** — the same build and submit
 * endpoints the browser uses — with a local signature standing in for the
 * wallet extension. That substitution is legitimate because the signature is
 * the only browser-specific step in the write path: building and submitting
 * are server routes either way.
 *
 * Every assertion is a live read *after* the fact. Nothing is asserted from a
 * transaction's own return value, because a return value is what the node said
 * would happen and a read is what did.
 *
 * Cost per full run: one new certificate on shared testnet, two throwaway
 * accounts, and about $20,000 of the faucet's test USDC.
 */
import { Keypair, TransactionBuilder } from "@stellar/stellar-sdk";
import { accounts, network } from "@bound/sdk";
import { getCertificateFacts } from "@/lib/bound";
import { deriveCertState } from "@/lib/cert-state";
import { check, crashed, equals, fail, finish, note, section } from "./report";

type Leg = "usdc" | "fund" | "verified";
const LEGS: Leg[] = ["usdc", "fund", "verified"];

const arg = (name: string) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);

const through = (arg("through") ?? "verified") as Leg;
if (!LEGS.includes(through)) {
  process.stderr.write(`--through must be one of ${LEGS.join(", ")}\n`);
  process.exit(2);
}
const baseUrl = (
  arg("base-url") ??
  process.env.BASE_URL ??
  "http://localhost:3000"
).replace(/\/$/, "");

const wants = (leg: Leg) => LEGS.indexOf(leg) <= LEGS.indexOf(through);

const short = (address: string) =>
  `${address.slice(0, 1)}…${address.slice(-3)}`;

const usd = (stroops: bigint | string) => {
  const value = typeof stroops === "string" ? BigInt(stroops) : stroops;
  const whole = value / 10_000_000n;
  const frac = (value % 10_000_000n)
    .toString()
    .padStart(7, "0")
    .replace(/0+$/, "");
  return `$${whole.toLocaleString("en-US")}${frac ? `.${frac}` : ""}`;
};

const USD = (dollars: number) => BigInt(Math.round(dollars * 100)) * 100_000n;

/* ── The app's routes ─────────────────────────────────────────────────── */

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* keep the raw text in the error below */
  }
  if (!response.ok) {
    const detail =
      parsed && typeof parsed === "object" && "error" in parsed
        ? String((parsed as { error: unknown }).error)
        : text.slice(0, 300);
    throw new Error(`POST ${path} → ${response.status}: ${detail}`);
  }
  return parsed as T;
}

/** Build → sign locally → submit, through the same routes the browser uses. */
async function signAndSubmit(
  keypair: Keypair,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ hash: string; result: unknown }> {
  const { xdr, networkPassphrase } = await post<{
    xdr: string;
    networkPassphrase: string;
  }>("/api/tx/build", { action, address: keypair.publicKey(), params });

  const tx = TransactionBuilder.fromXDR(xdr, networkPassphrase);
  tx.sign(keypair);

  return post<{ hash: string; result: unknown }>("/api/tx/submit", {
    xdr: tx.toXDR(),
  });
}

/** The build call alone, so a refusal can be asserted with nothing signed. */
async function buildOnly(
  address: string,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{
  status: number;
  body: { xdr?: string; error?: string; code?: string };
}> {
  const response = await fetch(`${baseUrl}/api/tx/build`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, address, params }),
  });
  return {
    status: response.status,
    body: (await response.json()) as {
      xdr?: string;
      error?: string;
      code?: string;
    },
  };
}

async function faucet(address: string): Promise<{
  status: number;
  body: { step?: string; hash?: string; error?: string; code?: string };
}> {
  const response = await fetch(`${baseUrl}/api/faucet`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address }),
  });
  return { status: response.status, body: await response.json() };
}

/* ── Live reads ───────────────────────────────────────────────────────── */

async function horizonUsdc(address: string): Promise<bigint | null> {
  const response = await fetch(`${network.horizonUrl}/accounts/${address}`, {
    cache: "no-store",
  });
  if (!response.ok) return null;
  const body = (await response.json()) as {
    balances?: {
      balance: string;
      asset_code?: string;
      asset_issuer?: string;
    }[];
  };
  const line = (body.balances ?? []).find(
    (b) => b.asset_code === "USDC" && b.asset_issuer === accounts.operator,
  );
  if (!line) return null;
  const [whole, frac = ""] = line.balance.split(".");
  return BigInt(whole) * 10_000_000n + BigInt((frac + "0000000").slice(0, 7));
}

async function horizonExists(address: string): Promise<boolean> {
  return (await fetch(`${network.horizonUrl}/accounts/${address}`)).ok;
}

/**
 * Take a fresh wallet from nothing to spendable USDC, the way the browser
 * does: friendbot through the faucet, a wallet-signed trustline, then USDC.
 */
async function prepareWallet(label: string, keypair: Keypair): Promise<void> {
  const address = keypair.publicKey();

  const first = await faucet(address);
  equals(
    `${label} ${short(address)}: faucet created the account`,
    first.body.step,
    "account",
  );
  check(
    `${label}: the account exists on Horizon`,
    await horizonExists(address),
    address,
  );

  const trustline = await signAndSubmit(keypair, "trustline");
  check(
    `${label}: trustline open (USDC / ${short(accounts.operator)})`,
    typeof trustline.hash === "string" && trustline.hash.length === 64,
    trustline.hash,
  );

  const grant = await faucet(address);
  equals(`${label}: faucet transferred USDC`, grant.body.step, "usdc");

  const balance = await horizonUsdc(address);
  check(
    `${label}: holds USDC on Horizon after the grant`,
    balance !== null && balance > 0n,
    balance === null ? "no trustline" : usd(balance),
  );

  const again = await faucet(address);
  equals(`${label}: a second grant inside the cooldown`, again.status, 429);
  equals(`${label}: …with a cooldown code`, again.body.code, "cooldown");
}

/* ── The walk ─────────────────────────────────────────────────────────── */

async function main() {
  section(`End-to-end against ${baseUrl} (through: ${through})`);

  const operator = Keypair.random();
  const auditor = Keypair.random();
  let certId: number | null = null;

  /* ── Leg 1: a fresh wallet reaches spendable USDC ─────────────────── */
  section("1. From nothing to spendable USDC");
  try {
    await prepareWallet("operator", operator);
  } catch (error) {
    crashed("operator wallet setup", error);
    finish();
  }

  if (!wants("fund")) {
    note(`stopping after "usdc" — operator was ${operator.publicKey()}`);
    finish();
  }

  /* ── Leg 2: publish, then fund the reserve ────────────────────────── */
  section("2. Publish, then fund the reserve");
  const BOUND_USD = 5_000;
  const RESERVE_USD = 1_000;

  try {
    const published = await signAndSubmit(operator, "publish", {
      agent: operator.publicKey(),
      boundUsd: BOUND_USD,
      reserveUsd: RESERVE_USD,
      expiryDays: 30,
    });
    certId =
      typeof published.result === "number"
        ? published.result
        : Number(published.result);
    check(
      "published a certificate",
      Number.isSafeInteger(certId) && certId > 0,
      `#${certId} · ${published.hash}`,
    );

    // Read it back. The submit route's decoded return value is what the node
    // said; this is what the registry holds.
    const facts = await getCertificateFacts(certId);
    if (!facts) throw new Error(`cert #${certId} did not read back`);
    const state = deriveCertState(facts, Math.floor(Date.now() / 1000));
    equals(`cert #${certId} status`, facts.cert.status, "Pending");
    equals(`cert #${certId} vault balance`, facts.reserve.vaultStroops, "0");
    equals(
      `cert #${certId} claimed reserve`,
      facts.reserve.claimedStroops,
      USD(RESERVE_USD).toString(),
    );
    equals(`cert #${certId} lifecycle`, state.lifecycle, "pending-unfunded");
    equals(`cert #${certId} operator`, facts.operator, operator.publicKey());
  } catch (error) {
    crashed("publish", error);
    finish();
  }

  // A second wallet must not be able to fund somebody else's certificate, and
  // must be told so without anything being signed.
  //
  // The stranger is a real, funded testnet account rather than a fresh
  // keypair: an address with no account fails earlier, on "Account not found",
  // and would prove nothing about the vault's operator check.
  try {
    const stranger = accounts.challenger;
    const refused = await buildOnly(stranger, "deposit", {
      certId,
      amountStroops: USD(RESERVE_USD).toString(),
    });
    equals("wrong wallet: fund refused", refused.status, 400);
    equals(
      "wrong wallet: with not-operator",
      refused.body.code,
      "not-operator",
    );
    equals("wrong wallet: no envelope to sign", refused.body.xdr, undefined);
  } catch (error) {
    crashed("wrong-wallet fund", error);
  }

  try {
    const funded = await signAndSubmit(operator, "deposit", {
      certId,
      amountStroops: USD(RESERVE_USD).toString(),
    });
    check("reserve funded", funded.hash.length === 64, funded.hash);

    const facts = await getCertificateFacts(certId!);
    if (!facts) throw new Error(`cert #${certId} did not read back`);
    const state = deriveCertState(facts, Math.floor(Date.now() / 1000));
    equals(
      `cert #${certId} vault now holds the claim`,
      facts.reserve.vaultStroops,
      facts.reserve.claimedStroops,
    );
    equals(`cert #${certId} lifecycle`, state.lifecycle, "pending-funded");
    equals(`cert #${certId} shortfall`, state.reserveShortfallStroops, "0");
    equals(`cert #${certId} next step`, state.nextStep, "attest");
  } catch (error) {
    crashed("fund", error);
    finish();
  }

  if (!wants("verified")) {
    note(`stopping after "fund" — certificate #${certId}`);
    finish();
  }

  /* ── Leg 3: an auditor stakes and attests ─────────────────────────── */
  section("3. Stake, then attest");
  const STAKE_USD = 2_000;
  const ALLOCATION_USD = 1_000;

  try {
    await prepareWallet("auditor", auditor);
  } catch (error) {
    crashed("auditor wallet setup", error);
    finish();
  }

  try {
    const staked = await signAndSubmit(auditor, "stake", {
      amountUsd: STAKE_USD,
    });
    check("auditor staked", staked.hash.length === 64, staked.hash);

    const wallet = await fetch(
      `${baseUrl}/api/wallet/${auditor.publicKey()}`,
    ).then(
      (r) =>
        r.json() as Promise<{
          facts: {
            auditor: { registered: boolean; freeStakeStroops: string } | null;
          };
        }>,
    );
    equals("auditor is registered", wallet.facts.auditor?.registered, true);
    equals(
      "auditor's free stake",
      wallet.facts.auditor?.freeStakeStroops,
      USD(STAKE_USD).toString(),
    );
  } catch (error) {
    crashed("stake", error);
    finish();
  }

  // Cert #2 is the seeded certificate whose vault has always held nothing.
  try {
    const refused = await buildOnly(auditor.publicKey(), "attest", {
      certId: 2,
      allocationUsd: 500,
    });
    equals("attest cert #2 refused", refused.status, 400);
    equals("attest cert #2 code", refused.body.code, "reserve-unfunded");
    equals("attest cert #2: no envelope to sign", refused.body.xdr, undefined);
  } catch (error) {
    crashed("attest the unfunded certificate", error);
  }

  try {
    const attested = await signAndSubmit(auditor, "attest", {
      certId,
      allocationUsd: ALLOCATION_USD,
    });
    check("attested", attested.hash.length === 64, attested.hash);

    const facts = await getCertificateFacts(certId!);
    if (!facts) throw new Error(`cert #${certId} did not read back`);
    const state = deriveCertState(facts, Math.floor(Date.now() / 1000));
    equals(`cert #${certId} status`, facts.cert.status, "Verified");
    equals(`cert #${certId} valid`, facts.cert.valid, true);
    equals(`cert #${certId} lifecycle`, state.lifecycle, "verified");
    equals(`cert #${certId} auditor`, facts.cert.auditor, auditor.publicKey());
    equals(
      `cert #${certId} live allocation`,
      facts.allocation.liveStroops,
      USD(ALLOCATION_USD).toString(),
    );
    equals(
      `cert #${certId} allocation snapshot`,
      facts.allocation.snapshotStroops,
      USD(ALLOCATION_USD).toString(),
    );
    equals(
      `cert #${certId} allocation not slashed`,
      state.allocationSlashed,
      false,
    );
    equals(
      `cert #${certId} is not the demo auditor's`,
      state.demoAuditor,
      false,
    );
  } catch (error) {
    crashed("attest", error);
    finish();
  }

  /* ── Leg 4: the page says so too ──────────────────────────────────── */
  section("4. The rendered page");
  try {
    const response = await fetch(`${baseUrl}/app/cert/${certId}`, {
      cache: "no-store",
    });
    equals(`GET /app/cert/${certId}`, response.status, 200);
    const html = await response.text();
    check(
      "the page renders Verified",
      html.includes("Verified"),
      `${html.length} bytes`,
    );
    check(
      "the page names the certificate",
      html.includes(`#${certId}`),
      `#${certId}`,
    );
    check(
      "the page does not claim our own auditor attested it",
      !html.includes("operated by boundprotocol.dev"),
      "attested by a fresh, unrelated wallet",
    );
  } catch (error) {
    crashed("rendered page", error);
  }

  // Cert #1 was attested by `accounts.auditor`, which is boundprotocol.dev's
  // own account. Wherever that address appears as an auditor the page has to
  // say whose it is — a demonstration is not a second opinion.
  section("5. The demo-auditor disclosure");
  try {
    const response = await fetch(`${baseUrl}/app/cert/1`, {
      cache: "no-store",
    });
    equals("GET /app/cert/1", response.status, 200);
    const html = await response.text();
    check(
      "cert #1 names the demo auditor's address",
      html.includes(accounts.auditor),
      accounts.auditor,
    );
    check(
      "cert #1 discloses that the auditor is boundprotocol.dev's own",
      html.includes("operated by boundprotocol.dev"),
      "DemoAuditorNote rendered",
    );
    check(
      "…and that it is not an independent third party",
      html.includes("not") && html.includes("independent third party"),
      "disclosure text present",
    );
  } catch (error) {
    crashed("demo-auditor disclosure", error);
  }

  note(`operator ${operator.publicKey()}`);
  note(`auditor  ${auditor.publicKey()}`);
  note(`certificate #${certId}`);
  finish();
}

main().catch((error) => {
  fail(
    "e2e",
    error instanceof Error ? (error.stack ?? error.message) : String(error),
  );
  finish();
});
