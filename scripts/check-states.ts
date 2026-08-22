/**
 * M6's acceptance: pagination, transaction lookup, and the states nobody wants
 * to see.
 *
 * Runs against a server (`pnpm dev` or `pnpm start`) and live testnet. Reads
 * only — nothing here signs or submits anything.
 *
 *   BASE_URL=http://localhost:3000 pnpm exec tsx scripts/check-states.ts
 */
import { spawnSync } from "node:child_process";
import { listCertificatePage, getCertificateFacts } from "@/lib/bound";
import { formatUsdcExact } from "@/components/app/usdc";
import { check, crashed, equals, fail, finish, note, section } from "./report";

const baseUrl = (
  process.env.BASE_URL ??
  process.argv.find((a) => a.startsWith("--base-url="))?.slice(11) ??
  "http://localhost:3000"
).replace(/\/$/, "");

/** Certificate ids linked from a rendered marketplace page. */
function certIdsIn(html: string): number[] {
  const ids = new Set<number>();
  for (const match of html.matchAll(/\/app\/cert\/(\d+)/g)) {
    ids.add(Number(match[1]));
  }
  return [...ids].sort((a, b) => b - a);
}

async function main() {
  section(`States against ${baseUrl}`);

  /* ── Pagination ──────────────────────────────────────────────────────── */
  try {
    const listing = await listCertificatePage(1);
    note(
      `registry holds ${listing.total} certificates, ${listing.pageSize} to a page (${listing.pageCount} pages)`,
    );

    const first = await fetch(`${baseUrl}/app?page=1`, { cache: "no-store" });
    const second = await fetch(`${baseUrl}/app?page=2`, { cache: "no-store" });
    equals("GET /app?page=1", first.status, 200);
    equals("GET /app?page=2", second.status, 200);

    const firstIds = certIdsIn(await first.text());
    const secondIds = certIdsIn(await second.text());
    const overlap = firstIds.filter((id) => secondIds.includes(id));
    check(
      "the two pages share no certificate",
      overlap.length === 0,
      `page 1: [${firstIds.join(",")}] · page 2: [${secondIds.join(",")}]`,
    );

    if (listing.total > listing.pageSize) {
      check(
        "page 1 is full",
        firstIds.length === listing.pageSize,
        `${firstIds.length} of ${listing.pageSize}`,
      );
      check(
        "page 2 carries the certificates page 1 could not",
        secondIds.length > 0 && Math.max(...secondIds) < Math.min(...firstIds),
        `newest on page 2 is #${Math.max(...secondIds)}, oldest on page 1 is #${Math.min(...firstIds)}`,
      );
    } else {
      // SPEC.md §5 M6 makes this assertion conditional on `total > pageSize`,
      // and on a registry smaller than a page there is genuinely no second page
      // to compare. Said out loud rather than passed silently.
      fail(
        "page 2 carries the certificates page 1 could not",
        `NOT EXERCISED: the registry holds ${listing.total} certificates and a page is ${listing.pageSize}, so there is no second page. Publish more certificates and re-run.`,
      );
    }

    const beyond = await fetch(`${baseUrl}/app?page=99`, { cache: "no-store" });
    equals("a page past the end still renders", beyond.status, 200);
    const nonsense = await fetch(`${baseUrl}/app?page=banana`, {
      cache: "no-store",
    });
    equals(
      "a page number that is not one renders page 1",
      nonsense.status,
      200,
    );
  } catch (error) {
    crashed("pagination", error);
  }

  /* ── Transaction lookup ──────────────────────────────────────────────── */
  section("Transaction lookup");
  try {
    // A hash that is definitely on-chain: the transaction that created the
    // newest certificate in the registry is not knowable from a read, so this
    // uses the most recent successful hash the journal-facing route can be
    // pointed at — the one this script is given, or a known-good default.
    const known =
      process.env.KNOWN_TX_HASH ??
      "b1b382f6aeb551b25b42db1c6dc2f299c0ac2a67b3bdd176a576a62fa04607b3";

    const good = await fetch(`${baseUrl}/api/tx/${known}`, {
      cache: "no-store",
    });
    const goodBody = (await good.json()) as { status?: string; hash?: string };
    equals(`GET /api/tx/${known.slice(0, 8)}…`, good.status, 200);
    equals("a landed transaction reads as SUCCESS", goodBody.status, "SUCCESS");

    const zeros = "0".repeat(64);
    const missing = await fetch(`${baseUrl}/api/tx/${zeros}`, {
      cache: "no-store",
    });
    const missingBody = (await missing.json()) as { status?: string };
    equals("an unknown hash is a 200, not an error", missing.status, 200);
    equals(
      "…and reads as NOT_FOUND rather than as a failure",
      missingBody.status,
      "NOT_FOUND",
    );

    const malformed = await fetch(`${baseUrl}/api/tx/nope`, {
      cache: "no-store",
    });
    equals("a malformed hash is a 400", malformed.status, 400);
  } catch (error) {
    crashed("transaction lookup", error);
  }

  /* ── The states nobody wants to see ──────────────────────────────────── */
  section("Unwanted states");
  try {
    const missing = await fetch(`${baseUrl}/app/cert/999999`, {
      cache: "no-store",
    });
    equals("GET /app/cert/999999", missing.status, 404);
  } catch (error) {
    crashed("missing certificate", error);
  }

  try {
    // Cert #2 is the certificate whose vault has always held nothing while its
    // record claims $1,000. The page has to show both figures — that gap is
    // the defect this whole milestone chain exists to close.
    const facts = await getCertificateFacts(2);
    if (!facts) throw new Error("cert #2 did not read back");
    const claimed = formatUsdcExact(facts.reserve.claimedStroops);
    const vault =
      facts.reserve.vaultStroops === null
        ? null
        : formatUsdcExact(facts.reserve.vaultStroops);

    equals("cert #2's vault still holds nothing", vault, "$0");

    const response = await fetch(`${baseUrl}/app/cert/2`, {
      cache: "no-store",
    });
    equals("GET /app/cert/2", response.status, 200);
    const html = await response.text();

    check(
      `the page prints the claimed figure (${claimed})`,
      html.includes(claimed),
      claimed,
    );
    check(
      "the page prints the live $0 the vault actually holds",
      html.includes("$0"),
      "$0",
    );
    check(
      "the page no longer calls the claim pre-funded",
      !html.includes("Pre-funded by the operator and locked against the bound"),
      "the old unqualified caption is gone",
    );
    check(
      "the page names the shortfall",
      html.includes("short by") || html.includes("Short by"),
      "shortfall stated",
    );
  } catch (error) {
    crashed("claimed vs live", error);
  }

  /* ── The journal, under vitest ───────────────────────────────────────── */
  section("Journal (vitest)");
  const vitest = spawnSync(
    "pnpm",
    ["exec", "vitest", "run", "lib/tx-journal.test.ts"],
    { encoding: "utf8" },
  );
  if (vitest.status === 0) {
    equals("lib/tx-journal.test.ts", vitest.status, 0);
  } else {
    fail(
      "lib/tx-journal.test.ts",
      (vitest.stdout ?? "") + (vitest.stderr ?? ""),
    );
  }

  finish();
}

main().catch((error) => {
  fail(
    "check-states",
    error instanceof Error ? (error.stack ?? error.message) : String(error),
  );
  finish();
});
