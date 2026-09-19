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
  readLimits,
} from "./anchor";

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
