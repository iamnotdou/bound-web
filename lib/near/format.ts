/**
 * Bound on NEAR: pure helpers. No network, no Node APIs, safe on both sides
 * and covered by vitest.
 *
 * This module is deliberately separate from `lib/bound.ts` and
 * `components/app/usdc.ts`: those are typed for Stellar `G...` addresses and
 * 7-decimal stroops. The NEAR contract speaks named accounts and 6-decimal
 * mock USDC, and mixing the two unit systems is how a figure ends up off by
 * a factor of ten.
 */

export const USDC_DECIMALS = 6;
const UNIT = 10n ** BigInt(USDC_DECIMALS);

export const explorerTx = (hash: string) =>
  `https://testnet.nearblocks.io/txns/${hash}`;
export const explorerAccount = (id: string) =>
  `https://testnet.nearblocks.io/address/${id}`;

/** 120000000 -> "120", 2700000 -> "2.7", 1234567890 -> "1,234.56789". */
export function formatMusdc(base: bigint | string): string {
  const v = typeof base === "string" ? BigInt(base) : base;
  const neg = v < 0n;
  const a = neg ? -v : v;
  const whole = (a / UNIT).toLocaleString("en-US");
  const frac = (a % UNIT)
    .toString()
    .padStart(USDC_DECIMALS, "0")
    .replace(/0+$/, "");
  return `${neg ? "-" : ""}${whole}${frac ? `.${frac}` : ""}`;
}

/** `a / b` in percent with two decimals, exact integer math; null if b <= 0. */
export function percentOf(
  a: bigint | string,
  b: bigint | string,
): number | null {
  const top = BigInt(a);
  const bottom = BigInt(b);
  if (bottom <= 0n) return null;
  return Number((top * 10_000n) / bottom) / 100;
}

/**
 * NEAR account id rules (nomicon): 2-64 chars, lowercase alphanumerics with
 * `-`/`_` separators inside parts and `.` between parts, or a 64-hex implicit
 * account. Used to refuse a query before it reaches the RPC.
 */
export function isNearAccountId(s: string): boolean {
  if (s.length < 2 || s.length > 64) return false;
  return /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/.test(s);
}

export interface Settlement {
  mode: string;
  settled_at: number;
  admitted: number;
  payable: string;
  reserve_draw: string;
  victim_paid: string;
  fee_paid: string;
  slash: string;
  /** Part of the slash paid to victims (bound-v2 onwards). */
  slash_to_victims?: string;
  to_treasury: string;
  auditor_returned: string;
  hygiene_bounty_paid: string;
}

/** JSON shape of `verify` / `get_cert` / `list_certs` (amounts are strings). */
export interface CertView {
  cert_id: number;
  status: string;
  operator: string;
  agent: string;
  auditor: string;
  bound: string;
  reserve_promised: string;
  reserve_locked: string;
  allocation: string;
  /** reserve_locked + allocation (bound-v2 onwards). */
  coverage?: string;
  premium: string;
  float: string;
  float_cap: string;
  spent: string;
  post_expiry_spent: string;
  pay_count: number;
  allowlist: string[] | null;
  expires_at: number;
  settlement_deadline: number;
  halted: boolean;
  window_closes_at: number | null;
  open_claims: number;
  settlement: Settlement | null;
  /** Block timestamp (seconds) at which the view was computed. */
  now: number;
}

export type Proof =
  | "InsufficientReserve"
  | "BoundExceeded"
  | "ExpiredSpend"
  | { Harm: { claimed: string; evidence_uri: string } };

export interface ChallengeView {
  challenge_id: number;
  cert_id: number;
  challenger: string;
  victim: string;
  proof: Proof;
  bond: string;
  filed_at: number;
  adjudicated: boolean;
  proven: boolean;
  harm: string;
  verdict: string;
}

export interface NearConfig {
  claim_window_secs: number;
  post_expiry_secs: number;
  grace_secs: number;
  min_stake: string;
  min_challenge_bond: string;
  challenger_fee_bps: number;
  de_minimis_bps: number;
  hygiene_bounty: string;
  protocol_fee_bps?: number;
}

export function proofLabel(p: Proof): string {
  if (typeof p === "string") {
    return {
      InsufficientReserve: "Insufficient reserve (trustless)",
      BoundExceeded: "Bound exceeded (trustless)",
      ExpiredSpend: "Spend after expiry (trustless)",
    }[p];
  }
  return `Harm claim of ${formatMusdc(p.Harm.claimed)} (arbiter-assessed)`;
}

export function proofEvidence(p: Proof): string | null {
  return typeof p === "object" ? p.Harm.evidence_uri : null;
}

/**
 * A counterparty's decision. The contract computes `status` at read time
 * (a Verified cert past expiry reads Expired, a frozen one Challenged), so
 * "Verified and not halted" is the whole rule. Same rule as `assess` in
 * `@bound/near` and the agent gate.
 */
export function assess(view: CertView | null): {
  deal: boolean;
  reason: string;
} {
  if (!view)
    return { deal: false, reason: "No Bound certificate for this agent" };
  if (view.status !== "Verified")
    return { deal: false, reason: `Certificate status is ${view.status}` };
  if (view.halted)
    return { deal: false, reason: "Halted by its operator: payments stopped" };
  return { deal: true, reason: "Verified: reserve locked and auditor staked" };
}

/**
 * What a counterparty can recover, as the bound-v2 waterfall computes it:
 * payable = min(harm, reserve + allocation); victims are paid from the
 * reserve first, then the auditor's slash tops up their unpaid arbitrated
 * harm. So victim cover = coverage = reserve + allocation, shared by every
 * arbitrated victim (and every service extending credit) of the certificate.
 * `bound` is a spend meter, not a guarantee.
 */
export function coverage(view: CertView) {
  const reserve = BigInt(view.reserve_locked);
  const allocation = BigInt(view.allocation);
  const bound = BigInt(view.bound);
  const total =
    view.coverage !== undefined ? BigInt(view.coverage) : reserve + allocation;
  return {
    victimCover: total,
    capitalAtRisk: total,
    bound,
    reserveFull: reserve >= BigInt(view.reserve_promised),
    spentPercentOfBound: percentOf(view.spent, view.bound),
  };
}

export type WindowState =
  | { kind: "none" }
  | { kind: "open"; closesAt: number; secondsLeft: number }
  | { kind: "closable"; closesAt: number };

export function windowState(view: CertView): WindowState {
  if (view.window_closes_at === null) return { kind: "none" };
  const left = view.window_closes_at - view.now;
  return left > 0
    ? { kind: "open", closesAt: view.window_closes_at, secondsLeft: left }
    : { kind: "closable", closesAt: view.window_closes_at };
}

export interface AccessKey {
  public_key: string;
  access_key: {
    nonce: number;
    permission:
      | "FullAccess"
      | {
          FunctionCall: {
            allowance: string | null;
            receiver_id: string;
            method_names: string[];
          };
        };
  };
}

/** `code_hash` of an account with no contract deployed. */
export const NO_CODE_HASH = "11111111111111111111111111111111";

export interface Confinement {
  /** True when every key is a FunctionCall key to `contractId` limited to
   *  `pay` AND the account has no contract code. */
  confined: boolean;
  /** The keys alone are pay-only. */
  keysConfined: boolean;
  /** `view_account.code_hash`; null when it could not be read. */
  codeHash: string | null;
  fullAccess: number;
  functionCall: Array<{
    publicKey: string;
    receiver: string;
    methods: string[];
    allowanceNear: string | null;
  }>;
  summary: string;
}

const YOCTO = 10n ** 24n;

/** 249035435373958800000000 -> "0.249" (NEAR, 3 dp, truncated). */
export function formatNear(yocto: string | bigint): string {
  const v = BigInt(yocto);
  const whole = v / YOCTO;
  const milli = ((v % YOCTO) * 1000n) / YOCTO;
  return `${whole}.${milli.toString().padStart(3, "0")}`;
}

/**
 * Proof of confinement from two RPC views anyone can call: the access key
 * list (every key a FunctionCall key for the Bound contract's `pay`) AND
 * `view_account.code_hash` (no contract code: code on the account would run
 * as the agent with no key and could call `pay`, `ft_transfer` or add a
 * full-access key). Then NEAR itself refuses any transfer, token call or
 * deposit the agent attempts. The Bound contract cannot check this itself.
 */
export function confinement(
  keys: AccessKey[],
  contractId: string,
  codeHash: string | null,
): Confinement {
  let fullAccess = 0;
  const functionCall: Confinement["functionCall"] = [];
  for (const k of keys) {
    const p = k.access_key.permission;
    if (p === "FullAccess") fullAccess++;
    else
      functionCall.push({
        publicKey: k.public_key,
        receiver: p.FunctionCall.receiver_id,
        methods: p.FunctionCall.method_names,
        allowanceNear:
          p.FunctionCall.allowance === null
            ? null
            : formatNear(p.FunctionCall.allowance),
      });
  }
  const scoped = functionCall.every(
    (k) =>
      k.receiver === contractId &&
      k.methods.length > 0 &&
      k.methods.every((m) => m === "pay"),
  );
  const keysConfined = keys.length > 0 && fullAccess === 0 && scoped;
  const noCode = codeHash === NO_CODE_HASH;
  const confined = keysConfined && noCode;
  let summary: string;
  if (keys.length === 0)
    summary = "No access keys: this account cannot sign at all";
  else if (fullAccess > 0)
    summary = `Not confined: ${fullAccess} full-access key${fullAccess === 1 ? "" : "s"} can move funds without the meter`;
  else if (!keysConfined)
    summary = "Not confined: a function-call key reaches beyond Bound's pay";
  else if (codeHash === null)
    summary =
      "Keys are pay-only, but the account's code hash could not be read, so confinement is unproven";
  else if (!noCode)
    summary = `Not confined: contract code (${codeHash}) is deployed on the agent account and runs as the agent without any key`;
  else
    summary = `Confined: ${functionCall.length === 1 ? "its only key is" : "every key is"} a function-call key for ${contractId}, method pay, and the account has no contract code`;
  return {
    confined,
    keysConfined,
    codeHash,
    fullAccess,
    functionCall,
    summary,
  };
}

/** RPC `call_function` returns the result as a byte array of UTF-8 JSON. */
export function decodeCallResult<T>(bytes: number[]): T {
  const text = new TextDecoder().decode(Uint8Array.from(bytes));
  return JSON.parse(text) as T;
}

/** Seconds to "1h 05m" / "4m 10s" / "12s"; days for long spans. */
export function formatDuration(secs: number): string {
  const s = Math.max(0, Math.floor(secs));
  const d = Math.floor(s / 86_400);
  const h = Math.floor((s % 86_400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(r).padStart(2, "0")}s`;
  return `${r}s`;
}

export function isoUtc(unixSecs: number): string {
  return new Date(unixSecs * 1000).toISOString().replace(".000Z", "Z");
}
