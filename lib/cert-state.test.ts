import { describe, expect, it } from "vitest";
import {
  deriveCertState,
  isDemoAuditor,
  LIFECYCLE_PRECEDENCE,
  LIFECYCLE_SUMMARY,
  type Lifecycle,
} from "@/lib/cert-state";
import { DEMO_AUDITOR } from "@/lib/deployment";
import type { CertFacts } from "@/lib/bound";
import type { CertListItem } from "@/lib/bound";

const NOW = 1_800_000_000;
const HOUR = 3600;

const USD = (dollars: number) => (BigInt(dollars) * 10_000_000n).toString();

function cert(overrides: Partial<CertListItem> = {}): CertListItem {
  return {
    certId: 42,
    agent: "GCF5HHJQRGFNI3DOYV52Z5QSXUMKKHLM5G4AB737JGWMKFQ3MTY6RLRT",
    valid: false,
    status: "Pending",
    boundUsd: "$5,000",
    reserveUsd: "$1,000",
    auditorStakeUsd: "$0",
    auditor: null,
    expiresAtUnix: NOW + 30 * 24 * HOUR,
    expiresAtIso: new Date((NOW + 30 * 24 * HOUR) * 1000).toISOString(),
    hasCert: true,
    ...overrides,
  };
}

function facts(overrides: Partial<CertFacts> = {}): CertFacts {
  return {
    cert: cert(),
    reserve: { claimedStroops: USD(1000), vaultStroops: USD(0) },
    allocation: { snapshotStroops: USD(0), liveStroops: USD(0) },
    freeze: {
      frozen: false,
      claimFreezeUnix: null,
      settlementDeadlineUnix: null,
    },
    operator: "GDOUNKJLAMAPLK7IZ2MGBE3S4RHF4SSQYPDRCGK2VNSP6IHFR5OQ7HGF",
    archived: false,
    ...overrides,
  };
}

describe("lifecycle precedence", () => {
  it("names every lifecycle exactly once, in the documented order", () => {
    expect([...LIFECYCLE_PRECEDENCE]).toEqual([
      "archived",
      "frozen",
      "invalid",
      "expired",
      "verified",
      "pending-funded",
      "pending-partial",
      "pending-unfunded",
    ]);
    expect(new Set(LIFECYCLE_PRECEDENCE).size).toBe(
      LIFECYCLE_PRECEDENCE.length,
    );
  });

  it("has a sentence for every lifecycle", () => {
    for (const state of LIFECYCLE_PRECEDENCE) {
      expect(LIFECYCLE_SUMMARY[state]).toBeTruthy();
    }
  });

  // Each case below turns on *every* condition at or below its own rank, so a
  // pass proves the winner outranks all of them rather than merely that the
  // one condition was read.
  const everythingWrong = {
    cert: cert({
      status: "Invalid" as const,
      expiresAtUnix: NOW - HOUR,
      auditor: DEMO_AUDITOR,
    }),
    reserve: { claimedStroops: USD(1000), vaultStroops: USD(0) },
    freeze: {
      frozen: true,
      claimFreezeUnix: NOW + HOUR,
      settlementDeadlineUnix: NOW + 100 * HOUR,
    },
  };

  it("archived outranks frozen, invalid and expired", () => {
    expect(
      deriveCertState(facts({ ...everythingWrong, archived: true }), NOW)
        .lifecycle,
    ).toBe("archived");
  });

  it("frozen outranks invalid and expired", () => {
    expect(
      deriveCertState(facts({ ...everythingWrong, archived: false }), NOW)
        .lifecycle,
    ).toBe("frozen");
  });

  it("invalid outranks expired", () => {
    expect(
      deriveCertState(
        facts({
          ...everythingWrong,
          archived: false,
          freeze: {
            frozen: false,
            claimFreezeUnix: null,
            settlementDeadlineUnix: null,
          },
        }),
        NOW,
      ).lifecycle,
    ).toBe("invalid");
  });

  it("expired outranks verified", () => {
    const state = deriveCertState(
      facts({
        cert: cert({ status: "Verified", expiresAtUnix: NOW - 1 }),
        reserve: { claimedStroops: USD(1000), vaultStroops: USD(1000) },
      }),
      NOW,
    );
    expect(state.lifecycle).toBe("expired");
  });

  it("is verified at the exact second it expires, and expired one after", () => {
    const at = cert({ status: "Verified", expiresAtUnix: NOW });
    expect(deriveCertState(facts({ cert: at }), NOW).lifecycle).toBe(
      "verified",
    );
    expect(deriveCertState(facts({ cert: at }), NOW + 1).lifecycle).toBe(
      "expired",
    );
  });

  it("verified outranks the funding states", () => {
    // A Verified certificate whose vault has since been drained is still
    // Verified: the funding states describe the road to attestation, not a
    // reading of an already-attested record.
    const state = deriveCertState(
      facts({
        cert: cert({ status: "Verified" }),
        reserve: { claimedStroops: USD(1000), vaultStroops: USD(0) },
      }),
      NOW,
    );
    expect(state.lifecycle).toBe("verified");
  });
});

describe("funding states", () => {
  it("is unfunded when the vault holds nothing", () => {
    const state = deriveCertState(
      facts({ reserve: { claimedStroops: USD(1000), vaultStroops: USD(0) } }),
      NOW,
    );
    expect(state.lifecycle).toBe("pending-unfunded");
    expect(state.reserveShortfallStroops).toBe(USD(1000));
    expect(state.reserveFundedRatio).toBe(0);
    expect(state.nextStep).toBe("fund");
  });

  it("is partial when the vault holds some of the claim", () => {
    const state = deriveCertState(
      facts({ reserve: { claimedStroops: USD(1000), vaultStroops: USD(250) } }),
      NOW,
    );
    expect(state.lifecycle).toBe("pending-partial");
    expect(state.reserveShortfallStroops).toBe(USD(750));
    expect(state.reserveFundedRatio).toBe(0.25);
    expect(state.nextStep).toBe("fund");
  });

  it("is funded when the vault holds the whole claim", () => {
    const state = deriveCertState(
      facts({
        reserve: { claimedStroops: USD(1000), vaultStroops: USD(1000) },
      }),
      NOW,
    );
    expect(state.lifecycle).toBe("pending-funded");
    expect(state.reserveShortfallStroops).toBe("0");
    expect(state.reserveFundedRatio).toBe(1);
    expect(state.nextStep).toBe("attest");
  });

  it("floors the shortfall at zero when the vault holds more than the claim", () => {
    const state = deriveCertState(
      facts({
        reserve: { claimedStroops: USD(1000), vaultStroops: USD(1500) },
      }),
      NOW,
    );
    expect(state.lifecycle).toBe("pending-funded");
    expect(state.reserveShortfallStroops).toBe("0");
    expect(state.reserveFundedRatio).toBe(1.5);
  });

  it("counts a single stroop short as short", () => {
    const claimed = USD(1000);
    const oneShort = (BigInt(claimed) - 1n).toString();
    const state = deriveCertState(
      facts({ reserve: { claimedStroops: claimed, vaultStroops: oneShort } }),
      NOW,
    );
    expect(state.lifecycle).toBe("pending-partial");
    expect(state.reserveShortfallStroops).toBe("1");
  });
});

describe("null is not zero", () => {
  it("reports an unreadable vault as unknown, not as empty", () => {
    const state = deriveCertState(
      facts({ reserve: { claimedStroops: USD(1000), vaultStroops: null } }),
      NOW,
    );
    expect(state.reserveShortfallStroops).toBeNull();
    expect(state.reserveFundedRatio).toBeNull();
  });

  it("still refuses to unlock attestation on an unreadable vault", () => {
    const state = deriveCertState(
      facts({ reserve: { claimedStroops: USD(1000), vaultStroops: null } }),
      NOW,
    );
    expect(state.nextStep).toBe("fund");
    expect(state.lifecycle).not.toBe("pending-funded");
  });

  it("reports no ratio when nothing is claimed, rather than dividing by zero", () => {
    const state = deriveCertState(
      facts({ reserve: { claimedStroops: "0", vaultStroops: "0" } }),
      NOW,
    );
    expect(state.reserveFundedRatio).toBeNull();
    expect(state.reserveShortfallStroops).toBe("0");
  });
});

describe("allocation", () => {
  it("calls it slashed only when the live number is below the snapshot", () => {
    const slashed = deriveCertState(
      facts({
        cert: cert({ status: "Verified", auditor: DEMO_AUDITOR }),
        allocation: { snapshotStroops: USD(1500), liveStroops: USD(400) },
      }),
      NOW,
    );
    expect(slashed.allocationSlashed).toBe(true);
  });

  it("does not call an intact allocation slashed", () => {
    const intact = deriveCertState(
      facts({
        allocation: { snapshotStroops: USD(1500), liveStroops: USD(1500) },
      }),
      NOW,
    );
    expect(intact.allocationSlashed).toBe(false);
  });

  it("does not call an unreadable allocation slashed", () => {
    const unknown = deriveCertState(
      facts({
        allocation: { snapshotStroops: USD(1500), liveStroops: null },
      }),
      NOW,
    );
    expect(unknown.allocationSlashed).toBe(false);
  });
});

describe("demo auditor", () => {
  it("recognises boundprotocol.dev's own auditor account", () => {
    expect(isDemoAuditor(DEMO_AUDITOR)).toBe(true);
    expect(
      deriveCertState(facts({ cert: cert({ auditor: DEMO_AUDITOR }) }), NOW)
        .demoAuditor,
    ).toBe(true);
  });

  it("does not claim an unattested certificate has one", () => {
    expect(isDemoAuditor(null)).toBe(false);
    expect(deriveCertState(facts(), NOW).demoAuditor).toBe(false);
  });

  it("does not mark a third-party auditor as the demo one", () => {
    const other = "GDOW5KBNLB23YWPTZBVD7BKZVWHPSRYOMOU6G4AXKDPCXMK7OA2QGWEM";
    expect(isDemoAuditor(other)).toBe(false);
  });
});

describe("next step", () => {
  const cases: [Lifecycle, CertFacts, "fund" | "attest" | "none"][] = [
    ["archived", facts({ archived: true }), "none"],
    [
      "frozen",
      facts({
        freeze: {
          frozen: true,
          claimFreezeUnix: NOW + HOUR,
          settlementDeadlineUnix: NOW + 100 * HOUR,
        },
      }),
      "none",
    ],
    ["invalid", facts({ cert: cert({ status: "Invalid" }) }), "none"],
    ["expired", facts({ cert: cert({ expiresAtUnix: NOW - 1 }) }), "none"],
    ["verified", facts({ cert: cert({ status: "Verified" }) }), "none"],
    [
      "pending-funded",
      facts({
        reserve: { claimedStroops: USD(1000), vaultStroops: USD(1000) },
      }),
      "attest",
    ],
    [
      "pending-partial",
      facts({ reserve: { claimedStroops: USD(1000), vaultStroops: USD(1) } }),
      "fund",
    ],
    ["pending-unfunded", facts(), "fund"],
  ];

  it.each(cases)("%s → %s", (lifecycle, input, step) => {
    const state = deriveCertState(input, NOW);
    expect(state.lifecycle).toBe(lifecycle);
    expect(state.nextStep).toBe(step);
  });

  it("covers every lifecycle", () => {
    expect(cases.map(([lifecycle]) => lifecycle).sort()).toEqual(
      [...LIFECYCLE_PRECEDENCE].sort(),
    );
  });
});
