/**
 * Put the demo's server-side accounts into the state the app expects.
 *
 * Idempotent: it reads what exists before it does anything, and re-running it
 * on a healthy deployment does nothing but print. **Local only** — it holds the
 * operator/issuer key, which is the one key that must never reach a server.
 *
 *   pnpm setup:demo
 *
 * It does three things:
 *
 *   1. Makes sure a dedicated faucet account exists, has XLM, has a USDC
 *      trustline, and holds enough test USDC to keep handing out grants. The
 *      faucet is a separate disposable account rather than the issuer, so
 *      `FAUCET_SECRET` on Vercel is worth only its balance.
 *   2. Makes sure the demo auditor has enough *free* stake to attest with.
 *   3. Prints the two `vercel env add` commands, which are the user's to run.
 *
 * `OPERATOR_SECRET` and `AUDITOR_SECRET` come from the local environment
 * (`.env.local`), never from a route handler and never from CI. A generated
 * `FAUCET_SECRET` is appended to `.env.local` so the local faucet route works.
 */
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { accounts, bound, network } from "@bound/sdk";
import { formatStroops, readAccount, friendbot } from "@/lib/faucet";
import { USDC_ISSUER } from "@/lib/deployment";
import { check, crashed, note, pass, section } from "./report";

/** What the faucet is topped up to when it falls below the floor. */
const FAUCET_TARGET_STROOPS = 1_000_000n * 10_000_000n; // $1,000,000
const FAUCET_FLOOR_STROOPS = 100_000n * 10_000_000n; // $100,000

/** What the demo auditor keeps free, so `/api/attest` always has room. */
const AUDITOR_FREE_FLOOR_STROOPS = 2_000n * 10_000_000n; // $2,000
const AUDITOR_TOPUP_STROOPS = 10_000n * 10_000_000n; // $10,000

const ENV_PATH = join(process.cwd(), ".env.local");

function readEnvLocal(): Record<string, string> {
  if (!existsSync(ENV_PATH)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(ENV_PATH, "utf8").split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (match) out[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

function requireSecret(name: string, env: Record<string, string>): Keypair {
  const raw = (process.env[name] ?? env[name] ?? "").trim();
  if (!raw) {
    throw new Error(
      `${name} is not set. Copy it into .env.local before running this script.`,
    );
  }
  return Keypair.fromSecret(raw);
}

async function ensureTrustline(keypair: Keypair): Promise<boolean> {
  const server = new Horizon.Server(network.horizonUrl);
  const source = await server.loadAccount(keypair.publicKey());
  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: network.passphrase,
  })
    .addOperation(
      Operation.changeTrust({ asset: new Asset("USDC", USDC_ISSUER) }),
    )
    .setTimeout(60)
    .build();
  tx.sign(keypair);
  await server.submitTransaction(tx);
  return true;
}

async function main() {
  const env = readEnvLocal();
  section(`Demo setup against ${network.horizonUrl}`);

  const operator = requireSecret("OPERATOR_SECRET", env);
  if (operator.publicKey() !== accounts.operator) {
    throw new Error(
      `OPERATOR_SECRET is ${operator.publicKey()} but the committed deployment names ${accounts.operator} as the operator. Refusing to act on a different account.`,
    );
  }
  pass("operator key matches the committed deployment", operator.publicKey());

  /* ── 1. The faucet ──────────────────────────────────────────────────── */

  section("Faucet account");
  let faucet: Keypair;
  let generated = false;
  if (env.FAUCET_SECRET || process.env.FAUCET_SECRET) {
    faucet = Keypair.fromSecret(
      (process.env.FAUCET_SECRET ?? env.FAUCET_SECRET).trim(),
    );
    pass("reusing the faucet in .env.local", faucet.publicKey());
  } else {
    faucet = Keypair.random();
    generated = true;
    appendFileSync(ENV_PATH, `\nFAUCET_SECRET=${faucet.secret()}\n`, "utf8");
    pass(
      "generated a new faucet and appended it to .env.local",
      faucet.publicKey(),
    );
  }

  let account = await readAccount(faucet.publicKey());
  if (!account.exists) {
    await friendbot(faucet.publicKey());
    account = await readAccount(faucet.publicKey());
    pass("friendbot created the faucet account", `${account.xlm} XLM`);
  } else {
    pass("faucet account already exists", `${account.xlm} XLM`);
  }

  if (!account.trustlineOpen) {
    await ensureTrustline(faucet);
    account = await readAccount(faucet.publicKey());
    pass("opened the faucet's USDC trustline", "USDC / " + USDC_ISSUER);
  } else {
    pass("faucet's USDC trustline is already open", "USDC / " + USDC_ISSUER);
  }

  const held = account.usdcStroops ?? 0n;
  if (held < FAUCET_FLOOR_STROOPS) {
    const topUp = FAUCET_TARGET_STROOPS - held;
    // The operator is the issuer, so this mints rather than moving somebody
    // else's money. It is the only step in the whole app that needs that key,
    // which is exactly why it lives in a local script.
    await bound.mintUsdc(operator, faucet.publicKey(), topUp);
    const after = await readAccount(faucet.publicKey());
    pass(
      "topped the faucet up",
      `${formatStroops(held)} → ${formatStroops(after.usdcStroops ?? 0n)}`,
    );
  } else {
    pass("faucet holds enough USDC", formatStroops(held));
  }

  /* ── 2. The demo auditor ────────────────────────────────────────────── */

  section("Demo auditor");
  const auditor = requireSecret("AUDITOR_SECRET", env);
  if (auditor.publicKey() !== accounts.auditor) {
    throw new Error(
      `AUDITOR_SECRET is ${auditor.publicKey()} but the committed deployment names ${accounts.auditor}.`,
    );
  }
  pass("auditor key matches the committed deployment", auditor.publicKey());

  const minStake = await bound.auditorMinStake();
  const stakeBefore = await bound.auditorStake(auditor.publicKey());
  const freeBefore = await freeStake(auditor.publicKey());
  note(
    `min stake ${formatStroops(minStake)} · staked ${formatStroops(stakeBefore)} · free ${formatStroops(freeBefore)}`,
  );

  if (freeBefore < AUDITOR_FREE_FLOOR_STROOPS) {
    const auditorUsdc =
      (await readAccount(auditor.publicKey())).usdcStroops ?? 0n;
    if (auditorUsdc < AUDITOR_TOPUP_STROOPS) {
      await bound.mintUsdc(
        operator,
        auditor.publicKey(),
        AUDITOR_TOPUP_STROOPS,
      );
      pass(
        "minted USDC to the demo auditor",
        formatStroops(AUDITOR_TOPUP_STROOPS),
      );
    }
    await bound.stakeAsAuditor(auditor, AUDITOR_TOPUP_STROOPS);
    const freeAfter = await freeStake(auditor.publicKey());
    pass(
      "staked more for the demo auditor",
      `free ${formatStroops(freeBefore)} → ${formatStroops(freeAfter)}`,
    );
  } else {
    pass("demo auditor already has free stake", formatStroops(freeBefore));
  }

  check(
    "demo auditor is registered",
    await bound.auditorRegistered(auditor.publicKey()),
    "registration is judged on free stake",
  );

  /* ── 3. What the user has to do ─────────────────────────────────────── */

  section("Waiting for you — these are not run by this script");
  process.stdout.write(`
  The two secrets the deployment needs, and nothing else:

    vercel env add FAUCET_SECRET production
      ${faucet.secret()}

    vercel env add AUDITOR_SECRET production
      ${auditor.secret()}

  Do NOT add OPERATOR_SECRET anywhere. It is the USDC issuer and the operator
  of every seeded certificate; no route handler in this app reads it, and it
  must never leave this machine.

  Then deploy:

    vercel --prod

`);

  if (generated) {
    note("FAUCET_SECRET was appended to .env.local — .env* is gitignored");
  }
  note("re-running this script is safe; it checks before it acts");
}

async function freeStake(address: string): Promise<bigint> {
  const { AuditorStakingClient, contracts, readSource } =
    await import("@bound/sdk");
  const staking = new AuditorStakingClient({
    contractId: contracts.auditorStaking,
    networkPassphrase: network.passphrase,
    rpcUrl: network.rpcUrl,
    publicKey: readSource,
  });
  return (await staking.get_free_stake({ auditor: address })).result;
}

main().catch((error) => {
  crashed("setup-demo", error);
  process.exit(1);
});
