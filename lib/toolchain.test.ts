import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

const require_ = createRequire(import.meta.url);

/**
 * `@stellar/stellar-sdk` does not expose `./package.json` through its exports
 * map, so its version is read off disk beside a file that *is* exported.
 */
function resolvedVersion(from: string): string {
  const entry = createRequire(from).resolve("@stellar/stellar-sdk");
  // dist/…/index.js → up to the package root, which holds package.json.
  let dir = dirname(entry);
  for (;;) {
    try {
      const raw = readFileSync(join(dir, "package.json"), "utf8");
      const parsed = JSON.parse(raw) as { name?: string; version?: string };
      if (parsed.name === "@stellar/stellar-sdk") return parsed.version ?? "";
    } catch {
      // keep walking
    }
    const up = dirname(dir);
    if (up === dir)
      throw new Error("no @stellar/stellar-sdk package.json above " + entry);
    dir = up;
  }
}

/**
 * `@bound/sdk` declares `@stellar/stellar-sdk@^16.0.1` and its generated
 * contract clients are typed against 16's `AssembledTransaction`. The repo used
 * to carry a second lockfile that resolved 13.3.0, so `npm ci` and
 * `pnpm install` built different trees and only one of them could produce the
 * envelopes this app asks a wallet to sign. Both trees are asserted, because
 * the app and the SDK resolve the dependency independently.
 */
describe("toolchain", () => {
  it("resolves @stellar/stellar-sdk on 16.x for the app", () => {
    expect(resolvedVersion(import.meta.url).split(".")[0]).toBe("16");
  });

  it("resolves @stellar/stellar-sdk on 16.x for @bound/sdk", () => {
    const sdkEntry = require_.resolve("@bound/sdk");
    expect(resolvedVersion(sdkEntry).split(".")[0]).toBe("16");
  });
});
