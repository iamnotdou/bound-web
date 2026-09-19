/**
 * The fiat boundary, checked against the live anchor.
 *
 * Reads only. Nothing here signs anything, submits anything, or moves a cent —
 * the one challenge it fetches is deliberately left unsigned. Safe to run as
 * often as you like.
 *
 *   pnpm exec tsx scripts/check-anchor.ts
 *
 * What it is for: `lib/anchor.test.ts` proves the parsing offline against a
 * fixture, which says nothing about whether the anchor still answers or still
 * answers in that shape. This asks it.
 *
 * The last section is the one to read before demoing anything. It compares the
 * asset the anchor issues against the asset the deployed contracts hold, and
 * they are currently different — a completed deposit funds a wallet and cannot
 * fund a reserve until the contracts are redeployed against the anchor's USDC.
 */
import { WebAuth } from "@stellar/stellar-sdk";
import { accounts } from "@bound/sdk";
import {
  ANCHOR_ASSET_CODE,
  ANCHOR_HOME_DOMAIN,
  anchorInfo,
  anchorToml,
  assetMatchesDeployment,
  issuerOf,
  sep10Challenge,
} from "@/lib/anchor";
import { USDC_ISSUER } from "@/lib/deployment";
import { check, crashed, equals, finish, note, pass, section } from "./report";

async function main() {
  section(`Anchor ${ANCHOR_HOME_DOMAIN}, asset ${ANCHOR_ASSET_CODE}`);

  /* ── SEP-1 ───────────────────────────────────────────────────────────── */
  const toml = await anchorToml();
  pass("stellar.toml is reachable and carries every key the flow needs");
  note(`web auth:  ${toml.webAuthEndpoint}`);
  note(`sep24:     ${toml.sep24Endpoint}`);
  note(`signing:   ${toml.signingKey}`);
  check(
    "the anchor declares the asset we intend to move",
    issuerOf(toml, ANCHOR_ASSET_CODE) !== null,
    `${ANCHOR_ASSET_CODE} issuer=${issuerOf(toml, ANCHOR_ASSET_CODE) ?? "absent from [[CURRENCIES]]"}`,
  );

  /* ── SEP-24 info ─────────────────────────────────────────────────────── */
  section("What the anchor will do");
  const info = await anchorInfo();
  check(
    "deposit is enabled",
    info.deposit.enabled,
    `enabled=${info.deposit.enabled}`,
  );
  // Both directions, because a reserve funded from fiat is half a rail if a
  // proven claim cannot be paid back out to fiat.
  check(
    "withdraw is enabled",
    info.withdraw.enabled,
    `enabled=${info.withdraw.enabled}`,
  );
  note(
    `deposit  min ${info.deposit.minAmount ?? "?"} max ${info.deposit.maxAmount ?? "?"}`,
  );
  note(
    `withdraw min ${info.withdraw.minAmount ?? "?"} max ${info.withdraw.maxAmount ?? "?"}`,
  );

  // Not a failure — a constraint the demo has to be sized against. Bound's
  // default economics are written in hundreds of dollars and this rail moves
  // ten at a time.
  if (info.deposit.maxAmount !== null && info.deposit.maxAmount < 100) {
    note(
      `the cap is ${info.deposit.maxAmount} ${info.assetCode} per transfer — scale the demo's amounts to it, or the walk-through stalls mid-flow`,
    );
  }

  /* ── SEP-10 ──────────────────────────────────────────────────────────── */
  section("SEP-10 challenge (fetched and validated, never signed)");
  const address = accounts.operator;
  const challenge = await sep10Challenge(address);
  pass(
    `the anchor issued a challenge for ${address.slice(0, 4)}…${address.slice(-4)}`,
  );

  // sep10Challenge already validated this; re-reading it here is what turns
  // "the call returned" into a printed fact a reader can check.
  const read = WebAuth.readChallengeTx(
    challenge.xdr,
    toml.signingKey,
    challenge.networkPassphrase,
    [ANCHOR_HOME_DOMAIN],
    ANCHOR_HOME_DOMAIN,
  );
  equals(
    "challenge is bound to the account we asked for",
    read.clientAccountID,
    address,
  );
  equals(
    "challenge is sequence 0, so it can never be submitted",
    read.tx.sequence,
    "0",
  );
  equals(
    "challenge is sourced by the anchor's declared signing key",
    read.tx.source,
    toml.signingKey,
  );
  equals(
    "challenge names the home domain we authenticated against",
    read.matchedHomeDomain,
    ANCHOR_HOME_DOMAIN,
  );
  check(
    "the anchor has already signed it",
    read.tx.signatures.length > 0,
    `signatures=${read.tx.signatures.length}`,
  );

  // The property that makes this safe to put in front of a wallet: a hostile
  // anchor swapping in a payment gets refused here, not in an approval dialog.
  const tampered = challenge.xdr.slice(0, -8) + "AAAAAAAA";
  let refused = false;
  try {
    WebAuth.readChallengeTx(
      tampered,
      toml.signingKey,
      challenge.networkPassphrase,
      [ANCHOR_HOME_DOMAIN],
      ANCHOR_HOME_DOMAIN,
    );
  } catch {
    refused = true;
  }
  check(
    "a tampered challenge is refused before any wallet sees it",
    refused,
    `refused=${refused}`,
  );

  /* ── The asset gap ───────────────────────────────────────────────────── */
  section("Does a completed deposit reach a reserve?");
  const matches = assetMatchesDeployment(info.issuer, USDC_ISSUER);
  note(`anchor issues     ${info.issuer ?? "—"}`);
  note(`deployment holds  ${USDC_ISSUER}`);
  if (matches) {
    pass("same asset — a deposit can fund a certificate's reserve directly");
  } else {
    // Deliberately not a failure. It is the true state of the deployment, and
    // the app says so rather than implying otherwise.
    note(
      "DIFFERENT ASSETS. A deposit funds the wallet and cannot fund a reserve until the contracts are redeployed against the anchor's asset. /app/fiat states this; do not claim otherwise in a demo.",
    );
  }

  finish();
}

main().catch((error) => {
  crashed("check-anchor", error);
  finish();
});
