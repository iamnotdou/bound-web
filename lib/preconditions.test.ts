import { describe, expect, it } from "vitest";
import {
  ACTION_KEYS,
  GATE_CODES,
  gate,
  gates,
  translateContractError,
  type ActionKey,
  type GateCode,
  type GateContext,
} from "@/lib/preconditions";
import { deriveCertState } from "@/lib/cert-state";
import { DEMO_AUDITOR, USDC_ISSUER } from "@/lib/deployment";
import type { CertFacts, CertListItem } from "@/lib/bound";
import type { WalletFacts } from "@/lib/wallet-facts";

const NOW = 1_800_000_000;
const DAY = 86_400;

const OPERATOR = "GDOUNKJLAMAPLK7IZ2MGBE3S4RHF4SSQYPDRCGK2VNSP6IHFR5OQ7HGF";
const AGENT = "GCF5HHJQRGFNI3DOYV52Z5QSXUMKKHLM5G4AB737JGWMKFQ3MTY6RLRT";
const STRANGER = "GDOW5KBNLB23YWPTZBVD7BKZVWHPSRYOMOU6G4AXKDPCXMK7OA2QGWEM";

const USD = (dollars: number) => (BigInt(dollars) * 10_000_000n).toString();

function cert(overrides: Partial<CertListItem> = {}): CertListItem {
  return {
    certId: 7,
    agent: AGENT,
    valid: false,
    status: "Pending",
    boundUsd: "$5,000",
    reserveUsd: "$1,000",
    auditorStakeUsd: "$0",
    auditor: null,
    expiresAtUnix: NOW + 30 * DAY,
    expiresAtIso: new Date((NOW + 30 * DAY) * 1000).toISOString(),
    hasCert: true,
    ...overrides,
  };
}

function certFacts(overrides: Partial<CertFacts> = {}): CertFacts {
  return {
    cert: cert(),
    reserve: { claimedStroops: USD(1000), vaultStroops: USD(0) },
    allocation: { snapshotStroops: USD(0), liveStroops: USD(0) },
    freeze: {
      frozen: false,
      claimFreezeUnix: null,
      settlementDeadlineUnix: NOW + 37 * DAY,
    },
    operator: OPERATOR,
    archived: false,
    ...overrides,
  };
}

function wallet(overrides: Partial<WalletFacts> = {}): WalletFacts {
  return {
    address: OPERATOR,
    accountExists: true,
    xlmBalance: "10000.0000000",
    trustlineOpen: true,
    usdcStroops: USD(50_000),
    auditor: {
      registered: false,
      minStakeStroops: USD(500),
      freeStakeStroops: USD(0),
      allocatedStroops: USD(0),
    },
    isDemoAuditor: false,
    ...overrides,
  };
}

function ctx(overrides: Partial<GateContext> = {}): GateContext {
  const facts = overrides.facts === undefined ? certFacts() : overrides.facts;
  return {
    address: OPERATOR,
    wallet: wallet(),
    facts,
    state: facts === null ? null : deriveCertState(facts, NOW),
    nowUnix: NOW,
    ...overrides,
  };
}

/** Every code this suite proves the table can produce. */
const produced = new Set<GateCode>();

function codeOf(action: ActionKey, context: GateContext): GateCode {
  const result = gate(action, context);
  const code: GateCode = result.ok ? "ok" : result.code;
  produced.add(code);
  return code;
}

describe("no wallet, no account", () => {
  it("refuses every action without a connected address", () => {
    for (const action of ACTION_KEYS) {
      expect(codeOf(action, ctx({ address: null, wallet: null }))).toBe(
        "no-wallet",
      );
    }
  });

  it("refuses every action while the wallet has not been read", () => {
    for (const action of ACTION_KEYS) {
      expect(codeOf(action, ctx({ wallet: null }))).toBe("no-wallet");
    }
  });

  it("sends an address with no account to fund it first", () => {
    const context = ctx({ wallet: wallet({ accountExists: false }) });
    expect(codeOf("stake", context)).toBe("no-account");
    expect(codeOf("publish", context)).toBe("no-account");
    expect(codeOf("trustline", context)).toBe("no-account");
  });

  it("still lets the faucet run for an address with no account", () => {
    // The faucet friendbots the account itself; refusing here would be a
    // dead end for exactly the wallet the faucet exists to serve.
    expect(
      codeOf("faucet", ctx({ wallet: wallet({ accountExists: false }) })),
    ).toBe("ok");
  });
});

describe("USDC preconditions", () => {
  // Every case here runs as a wallet that is *not* the token's issuer. The
  // issuer is exempt on purpose and has its own case at the end.
  const holder = (overrides: Partial<WalletFacts> = {}) =>
    ctx({
      address: STRANGER,
      wallet: wallet({ address: STRANGER, ...overrides }),
    });
  const noTrustline = { trustlineOpen: false, usdcStroops: null };

  it("refuses to move USDC into a wallet with nowhere to put it", () => {
    expect(codeOf("faucet", holder(noTrustline))).toBe("no-trustline");
  });

  it("refuses to stake without a trustline", () => {
    expect(codeOf("stake", holder(noTrustline))).toBe("no-trustline");
  });

  it("refuses to stake with an empty balance", () => {
    expect(codeOf("stake", holder({ usdcStroops: "0" }))).toBe("no-usdc");
  });

  it("treats an unreadable balance as nothing to check against, not as zero", () => {
    const result = gate("stake", holder({ usdcStroops: null }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("no-usdc");
      expect(result.reason).toMatch(/could not be read/);
    }
  });

  it("refuses an amount larger than the balance", () => {
    expect(
      codeOf("stake", {
        ...holder({ usdcStroops: USD(100) }),
        amountStroops: USD(101),
      }),
    ).toBe("insufficient-usdc");
  });

  it("allows an amount exactly equal to the balance", () => {
    expect(
      codeOf("stake", {
        ...holder({ usdcStroops: USD(100) }),
        amountStroops: USD(100),
      }),
    ).toBe("ok");
  });

  it("exempts the token's own issuer, which has no trustline and no balance", () => {
    // Verified against the deployed token: the issuer's Horizon record carries
    // only XLM, while the SAC reports its balance as i128::MAX. A classic
    // issuer creates the asset in the act of sending it, so refusing it for
    // "no trustline" would refuse a transfer the contract accepts.
    const issuer = ctx({
      address: USDC_ISSUER,
      wallet: wallet({
        address: USDC_ISSUER,
        trustlineOpen: false,
        usdcStroops: null,
      }),
      amountStroops: USD(1_000_000),
    });
    expect(codeOf("stake", issuer)).toBe("ok");
  });
});

describe("funding a reserve", () => {
  it("lets the certificate's own operator fund an unfunded reserve", () => {
    expect(codeOf("fund", ctx())).toBe("ok");
  });

  it("refuses anybody but the operator recorded on the certificate", () => {
    expect(codeOf("fund", ctx({ address: STRANGER }))).toBe("not-operator");
  });

  it("refuses a reserve that already holds the whole claim", () => {
    expect(
      codeOf(
        "fund",
        ctx({
          facts: certFacts({
            reserve: { claimedStroops: USD(1000), vaultStroops: USD(1000) },
          }),
        }),
      ),
    ).toBe("already-funded");
  });

  it("still allows topping up a partially funded reserve", () => {
    expect(
      codeOf(
        "fund",
        ctx({
          facts: certFacts({
            reserve: { claimedStroops: USD(1000), vaultStroops: USD(400) },
          }),
        }),
      ),
    ).toBe("ok");
  });

  it("refuses a frozen certificate", () => {
    expect(
      codeOf(
        "fund",
        ctx({
          facts: certFacts({
            freeze: {
              frozen: true,
              claimFreezeUnix: NOW + DAY,
              settlementDeadlineUnix: NOW + 37 * DAY,
            },
          }),
        }),
      ),
    ).toBe("frozen");
  });

  it("refuses an archived certificate", () => {
    expect(codeOf("fund", ctx({ facts: certFacts({ archived: true }) }))).toBe(
      "archived",
    );
  });

  it("refuses when the certificate could not be read at all", () => {
    expect(codeOf("fund", ctx({ facts: null, state: null }))).toBe("archived");
  });
});

describe("attesting", () => {
  const funded = certFacts({
    reserve: { claimedStroops: USD(1000), vaultStroops: USD(1000) },
  });
  const registered = wallet({
    address: DEMO_AUDITOR,
    auditor: {
      registered: true,
      minStakeStroops: USD(500),
      freeStakeStroops: USD(2000),
      allocatedStroops: USD(0),
    },
    isDemoAuditor: true,
  });
  const auditorCtx = (overrides: Partial<GateContext> = {}) =>
    ctx({
      address: DEMO_AUDITOR,
      wallet: registered,
      facts: funded,
      ...overrides,
    });

  it("lets a registered auditor attest a funded certificate", () => {
    expect(codeOf("attest", auditorCtx())).toBe("ok");
  });

  it("refuses a certificate whose reserve is not funded", () => {
    expect(codeOf("attest", auditorCtx({ facts: certFacts() }))).toBe(
      "reserve-unfunded",
    );
  });

  it("refuses a partially funded reserve too", () => {
    const partial = certFacts({
      reserve: { claimedStroops: USD(1000), vaultStroops: USD(999) },
    });
    expect(codeOf("attest", auditorCtx({ facts: partial }))).toBe(
      "reserve-unfunded",
    );
  });

  it("refuses an unregistered wallet", () => {
    expect(
      codeOf(
        "attest",
        auditorCtx({ wallet: wallet({ address: DEMO_AUDITOR }) }),
      ),
    ).toBe("not-registered");
  });

  it("refuses an auditor whose stake is entirely allocated elsewhere", () => {
    const spent = wallet({
      address: DEMO_AUDITOR,
      auditor: {
        registered: true,
        minStakeStroops: USD(500),
        freeStakeStroops: USD(0),
        allocatedStroops: USD(2000),
      },
    });
    expect(codeOf("attest", auditorCtx({ wallet: spent }))).toBe(
      "insufficient-free-stake",
    );
  });

  it("refuses an allocation larger than the free stake", () => {
    expect(codeOf("attest", auditorCtx({ amountStroops: USD(2001) }))).toBe(
      "insufficient-free-stake",
    );
  });

  it("refuses the operator attesting its own certificate", () => {
    expect(
      codeOf(
        "attest",
        auditorCtx({
          address: OPERATOR,
          wallet: { ...registered, address: OPERATOR },
        }),
      ),
    ).toBe("self-attest");
  });

  it("refuses the agent attesting the certificate that bonds it", () => {
    expect(
      codeOf(
        "attest",
        auditorCtx({
          address: AGENT,
          wallet: { ...registered, address: AGENT },
        }),
      ),
    ).toBe("self-attest");
  });

  // The agent clause used to hang off `facts.operator !== null`, so an
  // unreadable operator switched off the agent check as well and let an agent
  // attest the certificate that bonds it.
  it("refuses the agent even when the operator could not be read", () => {
    const noOperator = certFacts({
      reserve: { claimedStroops: USD(1000), vaultStroops: USD(1000) },
      operator: null,
    });
    expect(
      codeOf(
        "attest",
        auditorCtx({
          address: AGENT,
          wallet: { ...registered, address: AGENT },
          facts: noOperator,
        }),
      ),
    ).toBe("self-attest");
  });

  // `usdc()` rounds to cents, so $0.001 arrives as 0n. Attesting with it would
  // bond nothing while the certificate went on to read Verified.
  it("refuses an allocation that rounds to zero stroops", () => {
    expect(codeOf("attest", auditorCtx({ amountStroops: "0" }))).toBe(
      "insufficient-free-stake",
    );
  });

  it("still allows the smallest allocation that is not zero", () => {
    expect(codeOf("attest", auditorCtx({ amountStroops: "100000" }))).toBe(
      "ok",
    );
  });

  it("refuses a certificate that already has an auditor", () => {
    const attested = certFacts({
      cert: cert({ status: "Verified", auditor: DEMO_AUDITOR }),
      reserve: { claimedStroops: USD(1000), vaultStroops: USD(1000) },
    });
    expect(codeOf("attest", auditorCtx({ facts: attested }))).toBe(
      "already-attested",
    );
  });

  it("refuses an invalidated certificate", () => {
    const invalid = certFacts({
      cert: cert({ status: "Invalid" }),
      reserve: { claimedStroops: USD(1000), vaultStroops: USD(1000) },
    });
    expect(codeOf("attest", auditorCtx({ facts: invalid }))).toBe(
      "already-attested",
    );
  });

  it("refuses an expired certificate", () => {
    const expired = certFacts({
      cert: cert({ expiresAtUnix: NOW - 1 }),
      reserve: { claimedStroops: USD(1000), vaultStroops: USD(1000) },
    });
    expect(codeOf("attest", auditorCtx({ facts: expired }))).toBe("expired");
  });
});

describe("challenging", () => {
  it("allows a bonded challenge against a live certificate", () => {
    expect(codeOf("challenge", ctx({ address: STRANGER }))).toBe("ok");
  });

  it("allows joining an open claim window", () => {
    // A frozen certificate is precisely the one worth filing against: the
    // window exists so other claimants can join it.
    const frozen = certFacts({
      freeze: {
        frozen: true,
        claimFreezeUnix: NOW + DAY,
        settlementDeadlineUnix: NOW + 37 * DAY,
      },
    });
    expect(codeOf("challenge", ctx({ address: STRANGER, facts: frozen }))).toBe(
      "ok",
    );
  });

  it("refuses once the settlement deadline has passed", () => {
    const settled = certFacts({
      cert: cert({ expiresAtUnix: NOW - 10 * DAY }),
      freeze: {
        frozen: false,
        claimFreezeUnix: null,
        settlementDeadlineUnix: NOW - DAY,
      },
    });
    expect(
      codeOf("challenge", ctx({ address: STRANGER, facts: settled })),
    ).toBe("past-deadline");
  });
});

describe("publishing", () => {
  it("needs no USDC — publishing writes a claim and moves no money", () => {
    expect(
      codeOf(
        "publish",
        ctx({ wallet: wallet({ usdcStroops: "0", trustlineOpen: false }) }),
      ),
    ).toBe("ok");
  });
});

describe("the gate set", () => {
  it("answers for every action at once", () => {
    const all = gates(ctx());
    expect(Object.keys(all).sort()).toEqual([...ACTION_KEYS].sort());
  });

  // The coverage assertion SPEC.md §5 M2 asks for. It runs last so every
  // earlier case has already contributed. If a code is unreachable, either the
  // table cannot produce it or nothing exercises it — both are worth failing on.
  it("produces every GateCode in the table", () => {
    const missing = GATE_CODES.filter((code) => !produced.has(code));
    expect(missing).toEqual([]);
  });
});

describe("translating what the chain said", () => {
  it("recognises a missing account", () => {
    expect(
      translateContractError(
        "Account not found: GDQ4JQABDQKF4X2TI4CGUSPTNSBFKHKLVASMF76E2MFBG6J6CMAL2QPW",
        "stake",
      )?.code,
    ).toBe("no-account");
  });

  it("recognises the token contract refusing a missing trustline", () => {
    const raw =
      'HostError: Error(Contract, #13)\n\nEvent log (newest first):\n   0: [Diagnostic Event] contract:CDIQ, topics:[error, Error(Contract, #13)], data:["trustline entry is missing for account", GB6IDBVU]';
    expect(translateContractError(raw, "stake")?.code).toBe("no-trustline");
  });

  it("recognises a balance too small for the transfer", () => {
    const raw =
      'HostError: Error(Contract, #10)\n   2: [Failed Diagnostic Event (not emitted)] data:["resulting balance is not within the allowed range", 0, -998999990000000, 9223372036854775807]';
    expect(translateContractError(raw, "fund")?.code).toBe("insufficient-usdc");
  });

  it("recognises state archival", () => {
    expect(
      translateContractError(
        "You need to restore some contract state before you can invoke this method.",
        "fund",
      )?.code,
    ).toBe("archived");
  });

  it("recognises an authorization the wallet cannot satisfy", () => {
    expect(
      translateContractError(
        "this transaction needs the signature of GDOUNKJL…, which the connected wallet does not hold",
        "fund",
      )?.code,
    ).toBe("not-operator");
    expect(
      translateContractError("HostError: Error(Auth, InvalidAction)", "fund")
        ?.code,
    ).toBe("not-operator");
  });

  it("reads the attest trace for an unregistered auditor", () => {
    const raw =
      "HostError: Error(WasmVm, InvalidAction)\n   1: [Diagnostic Event] contract:CBPU, topics:[fn_return, is_registered], data:false";
    expect(translateContractError(raw, "attest")?.code).toBe("not-registered");
  });

  it("reads the attest trace for an unfunded reserve", () => {
    const raw =
      "HostError: Error(WasmVm, InvalidAction)\n   1: [Diagnostic Event] contract:CD6V, topics:[fn_return, get_balance], data:0";
    expect(translateContractError(raw, "attest")?.code).toBe(
      "reserve-unfunded",
    );
  });

  it("does not read the attest trace for another action", () => {
    const raw =
      "HostError: Error(WasmVm, InvalidAction)\n   1: [Diagnostic Event] topics:[fn_return, get_balance], data:0";
    expect(translateContractError(raw, "fund")).toBeNull();
  });

  it("returns null for anything it has not seen, rather than guessing", () => {
    expect(
      translateContractError(
        "HostError: Error(WasmVm, InvalidAction)",
        "attest",
      ),
    ).toBeNull();
    expect(translateContractError("", "publish")).toBeNull();
    expect(
      translateContractError("something nobody has ever seen", "challenge"),
    ).toBeNull();
  });
});
