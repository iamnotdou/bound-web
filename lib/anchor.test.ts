/**
 * The pure half of the anchor client: SEP-1 field extraction and the
 * normalisation of SEP-24 limits.
 *
 * The fixture is the SDF reference anchor's real `stellar.toml`, trimmed but
 * not rewritten — a parser proved against a toml somebody invented for the test
 * proves only that the invention matches the parser.
 *
 * The networked half is not mocked. A mocked anchor asserts that the mock
 * matches the code that wrote it; the live checks belong in `scripts/`.
 */
import { describe, expect, it } from "vitest";
import {
  assetMatchesDeployment,
  issuerOf,
  parseStellarToml,
  webAuthDomain,
} from "./anchor";
import { amountRefusal, isTransferAmount, readLimits } from "./anchor-limits";

const REFERENCE_TOML = `ACCOUNTS = ["GCSGSR6KQQ5BP2FXVPWRL6SWPUSFWLVONLIBJZUKTVQB5FYJFVL6XOXE"]
VERSION = "0.1.0"
SIGNING_KEY = "GCHLHDBOKG2JWMJQBTLSL5XG6NO7ESXI2TAQKZXCXWXB5WI2X6W233PR"
NETWORK_PASSPHRASE = "Test SDF Network ; September 2015"

WEB_AUTH_ENDPOINT = "https://testanchor.stellar.org/auth"
KYC_SERVER = "https://testanchor.stellar.org/sep12"
TRANSFER_SERVER = "https://testanchor.stellar.org/sep6"
TRANSFER_SERVER_SEP0024 = "https://testanchor.stellar.org/sep24"

[[CURRENCIES]]
code = "SRT"
issuer = "GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B"
status = "test"

[[CURRENCIES]]
code = "USDC"
issuer = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
status = "test"

[[CURRENCIES]]
code = "native"
status = "test"
`;

describe("parseStellarToml()", () => {
  const toml = parseStellarToml(REFERENCE_TOML);

  it("reads the two endpoints SEP-10 and SEP-24 are driven from", () => {
    expect(toml.webAuthEndpoint).toBe("https://testanchor.stellar.org/auth");
    expect(toml.sep24Endpoint).toBe("https://testanchor.stellar.org/sep24");
  });

  it("reads the signing key a challenge is validated against", () => {
    expect(toml.signingKey).toBe(
      "GCHLHDBOKG2JWMJQBTLSL5XG6NO7ESXI2TAQKZXCXWXB5WI2X6W233PR",
    );
  });

  it("reads the network passphrase", () => {
    expect(toml.networkPassphrase).toBe("Test SDF Network ; September 2015");
  });

  it("does not confuse TRANSFER_SERVER with TRANSFER_SERVER_SEP0024", () => {
    // The SEP-6 endpoint is a prefix of the SEP-24 key's name and sits on the
    // line above it. A loose pattern reads the wrong one and every SEP-24 call
    // then 404s against a SEP-6 server.
    expect(toml.sep24Endpoint).not.toContain("sep6");
  });

  it("reads every currency block, including one with no issuer", () => {
    expect(toml.currencies.map((c) => c.code)).toEqual([
      "SRT",
      "USDC",
      "native",
    ]);
    expect(
      toml.currencies.find((c) => c.code === "native")?.issuer,
    ).toBeUndefined();
  });

  it("refuses a toml that cannot support the flow, naming what is missing", () => {
    const stripped = REFERENCE_TOML.replace(/^WEB_AUTH_ENDPOINT.*$/m, "");
    expect(() => parseStellarToml(stripped)).toThrow(/WEB_AUTH_ENDPOINT/);
  });

  it("names every missing key at once rather than one per attempt", () => {
    expect(() => parseStellarToml('VERSION = "0.1.0"\n')).toThrow(
      /WEB_AUTH_ENDPOINT, TRANSFER_SERVER_SEP0024, SIGNING_KEY, NETWORK_PASSPHRASE/,
    );
  });
});

describe("issuerOf()", () => {
  const toml = parseStellarToml(REFERENCE_TOML);

  it("finds the issuer the anchor declares for an asset", () => {
    expect(issuerOf(toml, "USDC")).toBe(
      "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    );
  });

  it("returns null for an asset the anchor does not issue", () => {
    expect(issuerOf(toml, "TRY")).toBeNull();
    expect(issuerOf(toml, "native")).toBeNull();
  });
});

describe("readLimits()", () => {
  it("reads the caps the anchor states", () => {
    const limits = readLimits(
      { USDC: { enabled: true, min_amount: 1, max_amount: 10 } },
      "USDC",
    );
    expect(limits).toEqual({ enabled: true, minAmount: 1, maxAmount: 10 });
  });

  it("treats an unstated cap as unknown, never as zero", () => {
    // The distinction the whole app is built on: "the anchor did not say" and
    // "the anchor said none" are different claims. A cap rendered as 0 refuses
    // every amount for a reason the user cannot see.
    const limits = readLimits({ USDC: { enabled: true } }, "USDC");
    expect(limits.minAmount).toBeNull();
    expect(limits.maxAmount).toBeNull();
  });

  it("treats an absent asset as disabled", () => {
    expect(readLimits({ USDC: { enabled: true } }, "TRY").enabled).toBe(false);
    expect(readLimits(undefined, "USDC").enabled).toBe(false);
  });

  it("requires enabled to be exactly true", () => {
    // Some anchors omit the flag entirely on an asset they do not serve.
    expect(readLimits({ USDC: {} }, "USDC").enabled).toBe(false);
  });
});

describe("assetMatchesDeployment()", () => {
  const ANCHOR_USDC =
    "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
  const SELF_ISSUED =
    "GDOUNKJLAMAPLK7IZ2MGBE3S4RHF4SSQYPDRCGK2VNSP6IHFR5OQ7HGF";

  it("is false while the deployment holds a different issuer's USDC", () => {
    // The live deployment's reserve is a self-issued test token. A completed
    // anchor deposit funds the wallet and cannot fund that reserve, and any
    // surface offering the rail has to say so.
    expect(assetMatchesDeployment(ANCHOR_USDC, SELF_ISSUED)).toBe(false);
  });

  it("is true once the contracts are deployed against the anchor's asset", () => {
    expect(assetMatchesDeployment(ANCHOR_USDC, ANCHOR_USDC)).toBe(true);
  });

  it("is false when the anchor declares no issuer for the asset", () => {
    expect(assetMatchesDeployment(null, SELF_ISSUED)).toBe(false);
  });
});

describe("amountRefusal()", () => {
  const open = { enabled: true, minAmount: 1, maxAmount: 10 };

  it("permits an amount inside the stated range", () => {
    expect(amountRefusal(open, 5, "USDC")).toBeNull();
  });

  it("treats both bounds as inclusive", () => {
    expect(amountRefusal(open, 1, "USDC")).toBeNull();
    expect(amountRefusal(open, 10, "USDC")).toBeNull();
  });

  it("refuses just outside either bound, naming the figure", () => {
    expect(amountRefusal(open, 10.01, "USDC")).toContain(
      "caps a single transfer at 10",
    );
    expect(amountRefusal(open, 0.99, "USDC")).toContain("minimum is 1");
  });

  it("is not constrained by a limit the anchor never stated", () => {
    const unstated = { enabled: true, minAmount: null, maxAmount: null };
    expect(amountRefusal(unstated, 1_000_000, "USDC")).toBeNull();
    expect(amountRefusal(unstated, 0.0000001, "USDC")).toBeNull();
  });

  it("refuses a direction the anchor does not offer, before looking at the amount", () => {
    // The bug this function exists to stop: the panel checked the withdraw
    // button against the DEPOSIT limits. Identical on the reference anchor, and
    // wrong the moment an anchor differs between directions.
    const closed = { enabled: false, minAmount: 1, maxAmount: 10 };
    expect(amountRefusal(closed, 5, "TRY")).toContain(
      "does not offer this direction for TRY",
    );
  });

  it("refuses a non-amount rather than comparing it", () => {
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(amountRefusal(open, bad, "USDC")).toBe("Enter an amount.");
    }
  });
});

describe("webAuthDomain()", () => {
  it("is the host of WEB_AUTH_ENDPOINT, which may not be the home domain", () => {
    // SEP-10 compares the challenge's `web_auth_domain` operation against this.
    // Passing the home domain instead looked correct only because the reference
    // anchor serves auth on itself; an anchor that splits them would have had
    // every challenge rejected.
    const split = parseStellarToml(
      REFERENCE_TOML.replace(
        'WEB_AUTH_ENDPOINT = "https://testanchor.stellar.org/auth"',
        'WEB_AUTH_ENDPOINT = "https://api.anchor.example/auth"',
      ),
    );
    expect(webAuthDomain(split)).toBe("api.anchor.example");
  });

  it("drops the scheme, the path and the trailing slash", () => {
    const toml = parseStellarToml(REFERENCE_TOML);
    expect(webAuthDomain(toml)).toBe("testanchor.stellar.org");
  });

  it("keeps a non-default port, which is part of the host", () => {
    const ported = parseStellarToml(
      REFERENCE_TOML.replace(
        "https://testanchor.stellar.org/auth",
        "https://localhost:8080/auth",
      ),
    );
    expect(webAuthDomain(ported)).toBe("localhost:8080");
  });
});

describe("parseStellarToml() — [[CURRENCIES]] headers", () => {
  it("splits a header that carries a trailing comment", () => {
    // Legal TOML. Unsplit, the block is appended to the previous currency, its
    // fields are read from that earlier block, and the asset vanishes — so the
    // app would report "different assets" for an anchor that issues the right
    // one.
    const commented = REFERENCE_TOML.replace(
      '[[CURRENCIES]]\ncode = "USDC"',
      '[[CURRENCIES]] # the one we move\ncode = "USDC"',
    );
    const toml = parseStellarToml(commented);
    expect(toml.currencies.map((c) => c.code)).toEqual([
      "SRT",
      "USDC",
      "native",
    ]);
    expect(issuerOf(toml, "USDC")).toBe(
      "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    );
  });
});

describe("isTransferAmount()", () => {
  it("accepts what the SEP-24 call accepts", () => {
    for (const good of ["5", "5.5", "0.0000001", "1000", " 5 "]) {
      expect(isTransferAmount(good), good).toBe(true);
    }
  });

  it("rejects the forms the panel used to let through", () => {
    // Each of these parses as a positive number, so the old client-side check
    // passed them and the server then dropped the amount in silence.
    for (const bad of [".5", "1e1", "+5", "5.", "-5", "", "abc", "Infinity"]) {
      expect(isTransferAmount(bad), bad).toBe(false);
    }
  });
});
