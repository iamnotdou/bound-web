import { describe, expect, it } from "vitest";
import {
  assess,
  confinement,
  coverage,
  decodeCallResult,
  NO_CODE_HASH,
  formatDuration,
  formatMusdc,
  formatNear,
  isNearAccountId,
  percentOf,
  proofLabel,
  windowState,
  type AccessKey,
  type CertView,
} from "./format";
import { DEMO_RUNS, NEAR_DEPLOYMENT, findRun } from "./deployment";

const C = "bound-v2.boundproto-nh26.testnet";

// Captured from testnet: get_cert {"cert_id":3} on 2026-11-13.
const SETTLED: CertView = {
  cert_id: 3,
  status: "Invalid",
  operator: "bound-operator-mwfgi0ij.testnet",
  agent: "bound-agent-mwfgi0ij.testnet",
  auditor: "bound-auditor-mwfgi0ij.testnet",
  bound: "150000000",
  reserve_promised: "100000000",
  reserve_locked: "0",
  allocation: "0",
  premium: "0",
  float: "0",
  float_cap: "20000000",
  spent: "5000000",
  post_expiry_spent: "0",
  pay_count: 1,
  allowlist: ["bound-service-mwfgi0ij.testnet"],
  expires_at: 1794607030,
  settlement_deadline: 1794607330,
  halted: false,
  window_closes_at: null,
  open_claims: 0,
  settlement: {
    mode: "fraud",
    settled_at: 1794603580,
    admitted: 1,
    payable: "120000000",
    reserve_draw: "100000000",
    victim_paid: "100000000",
    fee_paid: "0",
    slash: "20000000",
    to_treasury: "20000000",
    auditor_returned: "180000000",
    hygiene_bounty_paid: "0",
  },
  now: 1794604517,
};

const VERIFIED: CertView = {
  ...SETTLED,
  cert_id: 4,
  status: "Verified",
  bound: "50000000",
  reserve_promised: "30000000",
  reserve_locked: "30000000",
  allocation: "100000000",
  spent: "0",
  settlement: null,
};

describe("formatMusdc", () => {
  it("formats 6-decimal integers exactly", () => {
    expect(formatMusdc("120000000")).toBe("120");
    expect(formatMusdc(2_700_000n)).toBe("2.7");
    expect(formatMusdc("1234567890")).toBe("1,234.56789");
    expect(formatMusdc("1")).toBe("0.000001");
    expect(formatMusdc(-5_000_000n)).toBe("-5");
  });
});

describe("percentOf", () => {
  it("is exact and null on a zero base", () => {
    expect(percentOf("5000000", "150000000")).toBe(3.33);
    expect(percentOf("1", "0")).toBeNull();
  });
});

describe("isNearAccountId", () => {
  it.each([
    ["bound-agent2-mwfgi0ij.testnet", true],
    ["a1", true],
    ["37e828216baece194cbe11af47064ee0d0e04de01f1a27357a9a0b41f57bd11d", true],
    ["Bound.testnet", false],
    ["a", false],
    ["bad..testnet", false],
    ["-lead.testnet", false],
    ["GABC", false],
  ])("%s -> %s", (id, ok) => expect(isNearAccountId(id)).toBe(ok));
});

describe("assess", () => {
  it("deals only with Verified and not halted", () => {
    expect(assess(null).deal).toBe(false);
    expect(assess(SETTLED)).toEqual({
      deal: false,
      reason: "Certificate status is Invalid",
    });
    expect(assess(VERIFIED).deal).toBe(true);
    expect(assess({ ...VERIFIED, halted: true }).deal).toBe(false);
  });
});

describe("coverage", () => {
  it("victim cover is reserve + allocation (the slash tops victims up)", () => {
    const c = coverage(VERIFIED);
    expect(c.victimCover).toBe(130_000_000n);
    expect(coverage({ ...VERIFIED, coverage: "77" }).victimCover).toBe(77n);
    expect(c.capitalAtRisk).toBe(130_000_000n);
    expect(c.reserveFull).toBe(true);
    expect(coverage(SETTLED).reserveFull).toBe(false);
  });
});

describe("windowState", () => {
  it("open, closable, none", () => {
    expect(windowState(SETTLED)).toEqual({ kind: "none" });
    expect(
      windowState({ ...VERIFIED, window_closes_at: VERIFIED.now + 40 }),
    ).toEqual({ kind: "open", closesAt: VERIFIED.now + 40, secondsLeft: 40 });
    expect(
      windowState({ ...VERIFIED, window_closes_at: VERIFIED.now - 1 }).kind,
    ).toBe("closable");
  });
});

describe("confinement", () => {
  const fc = (receiver: string, methods: string[]): AccessKey => ({
    public_key: "ed25519:x",
    access_key: {
      nonce: 1,
      permission: {
        FunctionCall: {
          allowance: "249035435373958800000000",
          receiver_id: receiver,
          method_names: methods,
        },
      },
    },
  });
  const full: AccessKey = {
    public_key: "ed25519:y",
    access_key: { nonce: 1, permission: "FullAccess" },
  };

  const none = { code_hash: NO_CODE_HASH };

  it("accepts exactly one pay key on the Bound contract", () => {
    const c = confinement([fc(C, ["pay"])], C, {
      code_hash: NO_CODE_HASH,
      global_contract_hash: null,
      global_contract_account_id: null,
    });
    expect(c.confined).toBe(true);
    expect(c.functionCall[0].allowanceNear).toBe("0.249");
  });
  it("refuses a full-access key, another receiver, other methods, or no keys", () => {
    const n = none;
    expect(confinement([fc(C, ["pay"]), full], C, n).confined).toBe(false);
    expect(confinement([fc("usdc.x.testnet", ["pay"])], C, n).confined).toBe(
      false,
    );
    expect(confinement([fc(C, ["pay", "withdraw"])], C, n).confined).toBe(
      false,
    );
    expect(confinement([fc(C, [])], C, n).confined).toBe(false);
    expect(confinement([], C, n).confined).toBe(false);
  });
  it("refuses pay-only keys when the account has contract code", () => {
    const c = confinement([fc(C, ["pay"])], C, {
      code_hash: "AZU11gUWgawHb91Zr6maxPqoYAdS89ftNjfT5e3De1b",
    });
    expect(c.keysConfined).toBe(true);
    expect(c.confined).toBe(false);
    expect(c.summary).toMatch(/contract code/);
    expect(confinement([fc(C, ["pay"])], C, null).confined).toBe(false);
  });
  it("refuses pay-only keys when the account uses a global contract", () => {
    // A global-contract account reports code_hash of all ones.
    const byHash = confinement([fc(C, ["pay"])], C, {
      code_hash: NO_CODE_HASH,
      global_contract_hash: "3jNQ7nUb9vCtBKmqXFLDG3jEjrcKQbVgTtsrW7kNo1v9",
      global_contract_account_id: null,
    });
    expect(byHash.keysConfined).toBe(true);
    expect(byHash.confined).toBe(false);
    expect(byHash.globalContract).toBe(
      "3jNQ7nUb9vCtBKmqXFLDG3jEjrcKQbVgTtsrW7kNo1v9",
    );
    expect(byHash.summary).toMatch(/global contract/);
    const byAccount = confinement([fc(C, ["pay"])], C, {
      code_hash: NO_CODE_HASH,
      global_contract_hash: null,
      global_contract_account_id: "wallet.publisher.testnet",
    });
    expect(byAccount.confined).toBe(false);
    expect(byAccount.globalContract).toBe("wallet.publisher.testnet");
    expect(byAccount.summary).toMatch(/wallet\.publisher\.testnet/);
  });
  it("names every condition in the confined summary", () => {
    const c = confinement([fc(C, ["pay"])], C, none);
    expect(c.globalContract).toBeNull();
    expect(c.summary).toMatch(/no full-access key/);
    expect(c.summary).toMatch(/no global contract/);
  });
});

describe("misc", () => {
  it("decodes RPC byte results", () => {
    expect(decodeCallResult<number>([55])).toBe(7);
    expect(decodeCallResult<null>([110, 117, 108, 108])).toBeNull();
  });
  it("formats durations and NEAR", () => {
    expect(formatDuration(12)).toBe("12s");
    expect(formatDuration(250)).toBe("4m 10s");
    expect(formatDuration(3900)).toBe("1h 05m");
    expect(formatDuration(90_000)).toBe("1d 1h");
    expect(formatNear("1000000000000000000000000")).toBe("1.000");
  });
  it("labels proofs", () => {
    expect(proofLabel("InsufficientReserve")).toMatch(/trustless/);
    expect(
      proofLabel({ Harm: { claimed: "120000000", evidence_uri: "x" } }),
    ).toBe("Harm claim of 120 (arbiter-assessed)");
  });
});

describe("committed records", () => {
  it("point at the deployed contract and passed", () => {
    expect(NEAR_DEPLOYMENT.contracts.bound.accountId).toBe(C);
    for (const r of DEMO_RUNS.filter((x) => !x.superseded)) {
      expect(r.contract).toBe(C);
      expect(r.pass).toBe(true);
      expect(r.asserts.every((a) => a.pass)).toBe(true);
      expect(findRun(r.runId)).toBe(r);
    }
  });
});
