/**
 * One table for "may this wallet do this?" — read before the click, and read
 * again to explain the refusal after it.
 *
 * Gating and error translation are the same knowledge stated twice, and when
 * they live in two places they drift: the button says "ready" and the contract
 * says no, or the button says no for a reason the contract does not have. So
 * both come out of this module, and both speak the same `GateCode`.
 *
 * Pure and networkless. Every input arrives as a value, including the clock,
 * so the whole table is provable under vitest.
 *
 * The gate reads facts that were true when they were fetched; the contract
 * simulates now. They can disagree, and that race is why
 * `translateContractError` exists — not as a nicety, but because a gate that
 * passed and a transaction that failed is a normal event on a shared testnet.
 */
import { USDC_ISSUER } from "@/lib/deployment";
import type { CertFacts } from "@/lib/bound";
import type { CertState } from "@/lib/cert-state";
import type { WalletFacts } from "@/lib/wallet-facts";

export type ActionKey =
  | "publish"
  | "fund"
  | "stake"
  | "attest"
  | "challenge"
  | "faucet"
  | "trustline";

export const ACTION_KEYS: readonly ActionKey[] = [
  "publish",
  "fund",
  "stake",
  "attest",
  "challenge",
  "faucet",
  "trustline",
];

export type GateCode =
  | "ok"
  | "no-wallet"
  | "no-account"
  | "no-trustline"
  | "no-usdc"
  | "insufficient-usdc"
  | "not-operator"
  | "already-funded"
  | "reserve-unfunded"
  | "not-registered"
  | "insufficient-free-stake"
  | "self-attest"
  | "already-attested"
  | "frozen"
  | "expired"
  | "archived"
  | "past-deadline";

export const GATE_CODES: readonly GateCode[] = [
  "ok",
  "no-wallet",
  "no-account",
  "no-trustline",
  "no-usdc",
  "insufficient-usdc",
  "not-operator",
  "already-funded",
  "reserve-unfunded",
  "not-registered",
  "insufficient-free-stake",
  "self-attest",
  "already-attested",
  "frozen",
  "expired",
  "archived",
  "past-deadline",
];

export type Gate = { ok: true } | { ok: false; code: GateCode; reason: string };

export interface GateContext {
  address: string | null;
  wallet: WalletFacts | null;
  state: CertState | null;
  facts: CertFacts | null;
  /** The amount the action would move, in stroops. Checked against balances. */
  amountStroops?: string;
  /**
   * Not in SPEC.md §4.3's `GateContext`, added because `past-deadline` is a
   * comparison against a clock and a table that reads `Date.now()` inside
   * itself cannot be tested. Optional; defaults to the real clock.
   */
  nowUnix?: number;
}

const OK: Gate = { ok: true };

function no(code: GateCode, reason: string): Gate {
  return { ok: false, code, reason };
}

function toBig(value: string | null | undefined): bigint | null {
  if (value == null) return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function usd(stroops: bigint): string {
  const whole = stroops / 10_000_000n;
  const frac = (stroops % 10_000_000n)
    .toString()
    .padStart(7, "0")
    .replace(/0+$/, "");
  return `$${whole.toLocaleString("en-US")}${frac ? `.${frac}` : ""}`;
}

/* ── The shared opening checks ───────────────────────────────────────────── */

function connected(ctx: GateContext): Gate {
  if (!ctx.address) {
    return no("no-wallet", "Connect a wallet before signing this transaction.");
  }
  if (!ctx.wallet) {
    return no(
      "no-wallet",
      "This wallet's balances have not been read yet, so nothing can be checked before you sign.",
    );
  }
  if (!ctx.wallet.accountExists) {
    return no(
      "no-account",
      "This address has no account on testnet yet. It needs XLM before it can pay a transaction fee.",
    );
  }
  return OK;
}

/** Enough USDC, and a trustline to hold it in. */
function fundedWithUsdc(ctx: GateContext, what: string): Gate {
  const wallet = ctx.wallet;
  if (!wallet) return no("no-wallet", "This wallet has not been read yet.");

  // The asset's issuer is the one account that can always send USDC and yet
  // holds neither a trustline to it nor a balance in it: a classic issuer
  // creates the asset in the act of transferring it, and Horizon shows it
  // nothing. Verified against the deployed token — the issuer's SAC balance
  // reads as i128::MAX while its Horizon record carries only XLM. Reading that
  // record as "no USDC" would refuse a transfer the token contract accepts.
  if (wallet.address === USDC_ISSUER) return OK;

  if (!wallet.trustlineOpen) {
    return no(
      "no-trustline",
      "This wallet has no USDC trustline. Open one before it can hold or move USDC.",
    );
  }
  const held = toBig(wallet.usdcStroops);
  if (held === null) {
    return no(
      "no-usdc",
      "This wallet's USDC balance could not be read, so there is nothing to check the amount against.",
    );
  }
  if (held <= 0n) {
    return no("no-usdc", `This wallet holds no USDC, so it cannot ${what}.`);
  }
  const wanted = toBig(ctx.amountStroops);
  if (wanted !== null && wanted > held) {
    return no(
      "insufficient-usdc",
      `This wallet holds ${usd(held)} — ${usd(wanted)} is more than that.`,
    );
  }
  return OK;
}

/** The states in which a certificate accepts nothing at all. */
function certUsable(ctx: GateContext): Gate {
  const state = ctx.state;
  if (!state) {
    return no(
      "archived",
      "This certificate could not be read, so nothing can be checked before you sign.",
    );
  }
  if (state.lifecycle === "archived") {
    return no(
      "archived",
      "This certificate's ledger entry has been reclaimed by state archival. It has to be restored before anything can touch it.",
    );
  }
  if (state.lifecycle === "frozen") {
    return no(
      "frozen",
      "A claim window is open against this certificate. Its capital is frozen until the window closes.",
    );
  }
  return OK;
}

/* ── The table ───────────────────────────────────────────────────────────── */

export function gate(action: ActionKey, ctx: GateContext): Gate {
  const now = ctx.nowUnix ?? Math.floor(Date.now() / 1000);

  switch (action) {
    /**
     * Publishing moves no money: it writes a claim, and the wallet pays only
     * the network fee. So it needs an account and nothing else — in
     * particular it does not need USDC, which is exactly the thing the old
     * publish page had to say out loud because people expected otherwise.
     */
    case "publish":
      return connected(ctx);

    /**
     * A friendbot grant or a USDC transfer from the faucet account. The route
     * creates the account itself when it is missing, so a missing account is
     * not a refusal here — a missing trustline is, because USDC cannot land
     * anywhere to hold it.
     */
    case "faucet": {
      if (!ctx.address) {
        return no("no-wallet", "Connect a wallet for the faucet to pay.");
      }
      if (!ctx.wallet) {
        return no("no-wallet", "This wallet has not been read yet.");
      }
      if (!ctx.wallet.accountExists) return OK; // friendbot first
      if (!ctx.wallet.trustlineOpen) {
        return no(
          "no-trustline",
          "Open a USDC trustline first — the faucet cannot send USDC to a wallet with nowhere to put it.",
        );
      }
      return OK;
    }

    /** A classic `changeTrust`. Needs an account to pay for the entry. */
    case "trustline":
      return connected(ctx);

    /**
     * `ReserveVault::deposit` authenticates against
     * `Registry::get_cert_operator`, so only that certificate's operator can
     * fund it. The contract enforces that on its own; the gate states it
     * before the click so nobody signs into a refusal.
     */
    case "fund": {
      const base = connected(ctx);
      if (!base.ok) return base;
      const usable = certUsable(ctx);
      if (!usable.ok) return usable;

      const facts = ctx.facts;
      const state = ctx.state;
      if (!facts || !state) {
        return no("archived", "This certificate could not be read.");
      }
      if (facts.operator !== null && facts.operator !== ctx.address) {
        return no(
          "not-operator",
          "Only this certificate's operator can fund its reserve. The vault authenticates against the operator recorded on the certificate, not against whoever submits.",
        );
      }
      const claimed = toBig(facts.reserve.claimedStroops) ?? 0n;
      const vault = toBig(facts.reserve.vaultStroops);
      if (vault !== null && vault >= claimed) {
        return no(
          "already-funded",
          `The vault already holds ${usd(vault)} against a claim of ${usd(claimed)}. There is nothing left to fund.`,
        );
      }
      return fundedWithUsdc(ctx, "fund a reserve");
    }

    /** Depositing the auditor's own slashable capital. No certificate yet. */
    case "stake": {
      const base = connected(ctx);
      if (!base.ok) return base;
      return fundedWithUsdc(ctx, "stake");
    }

    /**
     * The order below is the order the contract fails in, near enough: it
     * refuses an expired or already-attested certificate before it looks at
     * the reserve, and it looks at the reserve before it looks at the
     * auditor's book.
     */
    case "attest": {
      const base = connected(ctx);
      if (!base.ok) return base;
      const usable = certUsable(ctx);
      if (!usable.ok) return usable;

      const facts = ctx.facts;
      const state = ctx.state;
      if (!facts || !state) {
        return no("archived", "This certificate could not be read.");
      }
      if (state.lifecycle === "invalid") {
        return no(
          "already-attested",
          "This certificate has been invalidated. Nothing can be attested onto it.",
        );
      }
      if (now > facts.cert.expiresAtUnix) {
        return no(
          "expired",
          "This certificate has expired. An attestation would bond capital to a covenant that no longer runs.",
        );
      }
      if (facts.cert.auditor !== null) {
        return no(
          "already-attested",
          "An auditor has already bonded capital to this certificate. A certificate carries one attestation.",
        );
      }
      const claimed = toBig(facts.reserve.claimedStroops) ?? 0n;
      const vault = toBig(facts.reserve.vaultStroops);
      if (vault === null) {
        return no(
          "reserve-unfunded",
          "This certificate's vault balance could not be read, so there is no way to tell whether the reserve backs the claim.",
        );
      }
      if (vault < claimed) {
        return no(
          "reserve-unfunded",
          `The vault holds ${usd(vault)} against a claimed reserve of ${usd(claimed)}. An auditor cannot attest a certificate whose reserve is not funded.`,
        );
      }
      if (
        facts.operator !== null &&
        (facts.operator === ctx.address || facts.cert.agent === ctx.address)
      ) {
        return no(
          "self-attest",
          "This wallet published or is the agent on this certificate. An attestation by the same party it vouches for is not third-party capital.",
        );
      }
      const auditor = ctx.wallet?.auditor ?? null;
      if (!auditor) {
        return no(
          "not-registered",
          "This wallet's auditor registration could not be read, so nothing can be checked before you sign.",
        );
      }
      if (!auditor.registered) {
        return no(
          "not-registered",
          `Registration is judged on free stake. Stake at least ${usd(toBig(auditor.minStakeStroops) ?? 0n)} of unallocated capital before attesting.`,
        );
      }
      const free = toBig(auditor.freeStakeStroops) ?? 0n;
      const wanted = toBig(ctx.amountStroops);
      if (free <= 0n) {
        return no(
          "insufficient-free-stake",
          "Every stroop of this wallet's stake is already allocated to other certificates. Free stake is what an attestation bonds.",
        );
      }
      if (wanted !== null && wanted > free) {
        return no(
          "insufficient-free-stake",
          `This wallet has ${usd(free)} of free stake — ${usd(wanted)} is more than that.`,
        );
      }
      return OK;
    }

    /**
     * Filing a challenge is allowed against a frozen certificate — joining an
     * open claim window is what the window is for — and against an expired
     * one, since `ExpiredCertificate` is a proof about post-expiry conduct.
     * What ends it is the settlement deadline.
     */
    case "challenge": {
      const base = connected(ctx);
      if (!base.ok) return base;

      const facts = ctx.facts;
      const state = ctx.state;
      if (!facts || !state) {
        return no("archived", "This certificate could not be read.");
      }
      if (state.lifecycle === "archived") {
        return no(
          "archived",
          "This certificate's ledger entry has been reclaimed by state archival. It has to be restored before it can be challenged.",
        );
      }
      const deadline = facts.freeze?.settlementDeadlineUnix ?? null;
      if (deadline !== null && now > deadline) {
        return no(
          "past-deadline",
          "This certificate's settlement deadline has passed. Its reserve and its auditor's allocation are no longer answerable to a claim.",
        );
      }
      return fundedWithUsdc(ctx, "post a challenge bond");
    }
  }
}

/** Every gate for one context, which is what the wallet endpoint returns. */
export function gates(ctx: GateContext): Record<ActionKey, Gate> {
  return Object.fromEntries(
    ACTION_KEYS.map((action) => [action, gate(action, ctx)]),
  ) as Record<ActionKey, Gate>;
}

/* ── Translation ─────────────────────────────────────────────────────────── */

/**
 * Recognised contract and host errors → the same `GateCode` and a plain
 * sentence.
 *
 * Every pattern below was taken from a real simulation against the deployed
 * v2 contracts, not from a design document. Anything unrecognised returns
 * `null`, and the caller shows the raw string **labelled as raw** — a friendly
 * sentence that guesses at a cause is worse than the contract's own words,
 * because the reader cannot tell it is a guess.
 *
 * The Bound contracts panic rather than returning typed errors, so a failed
 * `attest` surfaces as `Error(WasmVm, InvalidAction)` /
 * `UnreachableCodeReached` with no code to read. What *is* readable is the
 * diagnostic event log leading up to the trap: the contract's own sub-calls
 * and their return values. The two `attest` patterns below read those returns
 * — `is_registered → false`, `get_balance → 0` — rather than guessing which
 * line panicked.
 */
export function translateContractError(
  raw: string,
  action: ActionKey,
): { code: GateCode; message: string } | null {
  const text = raw ?? "";

  if (/Account not found/i.test(text)) {
    return {
      code: "no-account",
      message:
        "This address has no account on testnet, so it cannot pay a transaction fee. Fund it first.",
    };
  }

  if (/trustline entry is missing for account/i.test(text)) {
    return {
      code: "no-trustline",
      message:
        "The USDC trustline is not open on this wallet, so USDC cannot move to or from it.",
    };
  }

  if (/resulting balance is not within the allowed range/i.test(text)) {
    return {
      code: "insufficient-usdc",
      message:
        "The USDC balance is too small for this amount. The token contract refused the transfer before anything moved.",
    };
  }

  if (
    /restore some contract state/i.test(text) ||
    /ExpiredState/i.test(text) ||
    /\(Storage, MissingValue\)/i.test(text)
  ) {
    return {
      code: "archived",
      message:
        "Part of this certificate's on-chain state has been reclaimed by Soroban state archival. It has to be restored before this can run.",
    };
  }

  // Raised by this app, not by a contract: the assembled envelope carries an
  // authorization entry addressed to somebody else.
  if (/needs the signature of/i.test(text)) {
    return action === "fund"
      ? {
          code: "not-operator",
          message:
            "Only this certificate's operator can fund its reserve, and the envelope came back needing that operator's signature. Nothing was signed.",
        }
      : {
          code: "not-operator",
          message:
            "This transaction needs a signature from an address other than the connected wallet, so it cannot be signed here. Nothing was signed.",
        };
  }

  // The re-simulation rejected an authorization the envelope carries. For a
  // deposit that is always the same thing: the vault asked the certificate's
  // operator to authorize, and the submitter is not that address.
  if (/Error\(Auth, InvalidAction\)/.test(text)) {
    return action === "fund"
      ? {
          code: "not-operator",
          message:
            "The reserve vault authenticates against the operator recorded on this certificate, and refused this wallet's authorization. Nothing was signed.",
        }
      : {
          code: "not-operator",
          message:
            "The contract refused this wallet's authorization for this call. Nothing was signed.",
        };
  }

  if (action === "attest") {
    if (/fn_return, is_registered\], data:false/.test(text)) {
      return {
        code: "not-registered",
        message:
          "The staking contract does not count this wallet as a registered auditor. Registration is judged on free stake.",
      };
    }
    if (/fn_return, get_balance\], data:0\b/.test(text)) {
      return {
        code: "reserve-unfunded",
        message:
          "The reserve vault holds nothing for this certificate. An auditor cannot attest a certificate whose reserve is not funded.",
      };
    }
  }

  return null;
}
