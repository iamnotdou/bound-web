/**
 * M1's acceptance: prove the read layer reports what the chain holds, not what
 * the certificate claims.
 *
 * Runs against live testnet with no key and no writes. The fixtures are the
 * certificates that already existed before this milestone, chosen because they
 * cover the interesting cases without needing new on-chain state:
 *
 *   #1  Verified, unexpired, vault funded          → "verified"
 *   #2  Pending, vault holds exactly nothing       → "pending-unfunded"
 *   #3  Verified but past expiry, no claim window  → "expired"
 *   #5  Verified, past expiry, claim window OPEN   → "frozen"
 *
 * SPEC DEVIATION, deliberate: SPEC.md §5 M1 lists cert #5 as the "expired"
 * fixture. It is not — a challenge was filed against #5 (and #4) on testnet, so
 * `Registry::is_frozen` returns true for it, and §4.2 fixes freeze *above*
 * expiry in the precedence order. Both facts are asserted below: #5 is past its
 * expiry AND it derives to "frozen", which is what the locked precedence
 * requires. Cert #3 supplies the clean expiry fixture the spec wanted.
 */
import { contracts, network, readSource, RegistryClient } from "@bound/sdk";
import {
  getCertificateFacts,
  isKnownCertId,
  listCertificatePage,
  CERT_PAGE_SIZE,
} from "@/lib/bound";
import { deriveCertState, type Lifecycle } from "@/lib/cert-state";
import { check, crashed, equals, fail, finish, note, section } from "./report";

const now = Math.floor(Date.now() / 1000);

function registry() {
  return new RegistryClient({
    contractId: contracts.registry,
    networkPassphrase: network.passphrase,
    rpcUrl: network.rpcUrl,
    publicKey: readSource,
  });
}

async function factsFor(certId: number) {
  const facts = await getCertificateFacts(certId);
  if (!facts) throw new Error(`cert #${certId} could not be read at all`);
  return { facts, state: deriveCertState(facts, now) };
}

async function main() {
  section(`Live reads against ${network.rpcUrl} at ${now}`);

  // ── #1: Verified, funded ────────────────────────────────────────────────
  try {
    const { facts, state } = await factsFor(1);
    equals("cert #1 status", facts.cert.status, "Verified");
    equals("cert #1 valid", facts.cert.valid, true);
    check(
      "cert #1 vault holds more than nothing",
      facts.reserve.vaultStroops !== null &&
        BigInt(facts.reserve.vaultStroops) > 0n,
      `vault=${facts.reserve.vaultStroops}`,
    );
    equals(
      "cert #1 lifecycle",
      state.lifecycle,
      "verified" satisfies Lifecycle,
    );
    check(
      "cert #1 reserve is fully funded",
      state.reserveShortfallStroops === "0",
      `shortfall=${state.reserveShortfallStroops}`,
    );
  } catch (error) {
    crashed("cert #1", error);
  }

  // ── #2: Pending, vault exactly zero — the claimed-vs-live gap ───────────
  try {
    const { facts, state } = await factsFor(2);
    equals("cert #2 status", facts.cert.status, "Pending");
    equals("cert #2 vault balance", facts.reserve.vaultStroops, "0");
    check(
      "cert #2 claims a reserve it does not hold",
      BigInt(facts.reserve.claimedStroops) > 0n,
      `claimed=${facts.reserve.claimedStroops} vault=${facts.reserve.vaultStroops}`,
    );
    equals(
      "cert #2 shortfall equals the whole claim",
      state.reserveShortfallStroops,
      facts.reserve.claimedStroops,
    );
    equals(
      "cert #2 lifecycle",
      state.lifecycle,
      "pending-unfunded" satisfies Lifecycle,
    );
    equals("cert #2 next step", state.nextStep, "fund");
  } catch (error) {
    crashed("cert #2", error);
  }

  // ── #3: expired, unfrozen ───────────────────────────────────────────────
  try {
    const { facts, state } = await factsFor(3);
    check(
      "cert #3 is past its expiry",
      now > facts.cert.expiresAtUnix,
      `expires_at=${facts.cert.expiresAtIso}`,
    );
    equals("cert #3 recorded status", facts.cert.status, "Verified");
    equals("cert #3 has no open claim window", facts.freeze?.frozen, false);
    equals("cert #3 lifecycle", state.lifecycle, "expired" satisfies Lifecycle);
    equals("cert #3 valid", facts.cert.valid, false);
  } catch (error) {
    crashed("cert #3", error);
  }

  // ── #5: expired AND frozen — freeze outranks expiry ─────────────────────
  try {
    const { facts, state } = await factsFor(5);
    check(
      "cert #5 is past its expiry",
      now > facts.cert.expiresAtUnix,
      `expires_at=${facts.cert.expiresAtIso}`,
    );
    if (facts.freeze?.frozen) {
      note(
        "cert #5 has an open claim window on testnet — the spec expected a plain expiry here",
      );
      equals(
        "cert #5 lifecycle (freeze outranks expiry)",
        state.lifecycle,
        "frozen" satisfies Lifecycle,
      );
      check(
        "cert #5 reports when its window closes",
        facts.freeze.claimFreezeUnix !== null,
        `claim_freeze=${facts.freeze?.claimFreezeUnix}`,
      );
    } else {
      note("cert #5's claim window has since settled");
      equals(
        "cert #5 lifecycle",
        state.lifecycle,
        "expired" satisfies Lifecycle,
      );
    }
  } catch (error) {
    crashed("cert #5", error);
  }

  // ── The allocation snapshot vs the live allocation ──────────────────────
  try {
    const { facts, state } = await factsFor(1);
    check(
      "cert #1 live allocation is readable",
      facts.allocation.liveStroops !== null,
      `snapshot=${facts.allocation.snapshotStroops} live=${facts.allocation.liveStroops}`,
    );
    equals("cert #1 allocation is not slashed", state.allocationSlashed, false);
  } catch (error) {
    crashed("cert #1 allocation", error);
  }

  // ── Nothing is invented for an id the registry never issued ─────────────
  try {
    const missing = await getCertificateFacts(999_999);
    equals("cert #999999 reads as nothing", missing, null);
    equals(
      "cert #999999 is not a known id",
      await isKnownCertId(999_999),
      false,
    );
    equals("cert #1 is a known id", await isKnownCertId(1), true);
  } catch (error) {
    crashed("missing certificate", error);
  }

  // ── Pagination totals come from the registry, not from the page ─────────
  try {
    const count = Number((await registry().get_cert_count()).result);
    const page = await listCertificatePage(1);
    equals(
      "listCertificatePage(1).total = Registry.get_cert_count()",
      page.total,
      count,
    );
    equals("page size", page.pageSize, CERT_PAGE_SIZE);
    equals(
      "page count",
      page.pageCount,
      Math.max(1, Math.ceil(count / CERT_PAGE_SIZE)),
    );
    check(
      "page 1 holds no more than a page",
      page.items.length <= CERT_PAGE_SIZE,
      `items=${page.items.length} of ${count}`,
    );
    check(
      "page 1 is newest first",
      page.items.every(
        (item, i) => i === 0 || item.certId < page.items[i - 1].certId,
      ),
      page.items.map((i) => i.certId).join(","),
    );
    const beyond = await listCertificatePage(page.pageCount + 50);
    equals(
      "a page past the end clamps rather than erroring",
      beyond.page,
      page.pageCount,
    );
  } catch (error) {
    crashed("pagination", error);
  }

  finish();
}

main().catch((error) => {
  fail(
    "check-reads",
    error instanceof Error ? (error.stack ?? error.message) : String(error),
  );
  finish();
});
