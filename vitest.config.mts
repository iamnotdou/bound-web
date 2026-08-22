import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Offline tests only.
 *
 * Everything under `lib/` that vitest covers is pure: state derivation, the
 * precondition table, the journal. The things that talk to Stellar are proved
 * by `scripts/*.ts` against live testnet instead, because a mocked chain would
 * only ever assert that the mock matches the code that wrote it.
 */
export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts", "components/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
