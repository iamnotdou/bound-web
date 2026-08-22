# SPEC — a working end-to-end MVP

Status: proposed. No implementation code written yet.
Author date: 2026-08-22. Target repo: `bound-web` (private).

---

## 1. Goal

Make a browser user able to drive a certificate from nothing to **Verified**, on live
Stellar testnet, and make the app render every state that walk passes through — honestly,
including the states where it has nothing good to say.

The four legs:

```
publish  →  fund reserve  →  auditor stakes  →  auditor attests  →  Verified
 (exists)      (new)            (new UI)           (new UI)
```

Today the flow dies at leg 2. `@bound/sdk@0.5.0`'s `buildActionXdr` supports
`stake, attest, publish, deposit-fee, pay, challenge` — there is **no reserve deposit**.
A certificate published through `/app/new` lands Pending, cannot be funded from a browser,
and therefore can never be attested. `/app` has shown that dead end since launch.

Alongside the flow, the app must stop asserting things it has not read. `/app/cert/[id]`
currently prints the certificate's _claimed_ `reserve_amount` under the caption
"Pre-funded by the operator and locked against the bound". For cert #2 on testnet right
now that caption sits above **$1,000** while the vault holds **$0**. The MVP reads the
live balance and says which is which.

### What counts as done

A stranger with Freighter and no testnet assets can, in one sitting, reach a certificate
that reads `Verified · valid=true` and is independently checkable on-chain — and
`scripts/e2e.ts` proves the same walk headlessly and exits 0.

---

## 2. Out of scope — explicitly

Each of these was considered and deliberately excluded. None is a gap discovered late.

| Excluded                                                                              | Why                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PaymentRouter actions** — enroll, fund float, routed payment, halt/resume, clawback | `PaymentRouterClient` is not exported from `@bound/sdk`. Reaching it needs an SDK 0.6.0 publish (irreversible) or hand-rolled scval encoding. The existing read-only spend meter panel stays as it is.                                          |
| **PremiumVault actions** — pay premium, claim premium                                 | Same: `PremiumVaultClient` is not exported. The existing read-only coverage panel stays.                                                                                                                                                        |
| **Closing a claim window** (`close_window`)                                           | Reachable via the exported `ChallengeManagerClient`, but settlement is a separate story from reaching Verified, and the window is 72 hours — unobservable in a sitting. Filing a challenge stays as it is today.                                |
| **A database**                                                                        | Deferred by decision. §4.6 defines the `TxJournal` seam so the later DB is a second implementation, not a rewrite of the call sites.                                                                                                            |
| **Restoring archived ledger entries**                                                 | The app detects and explains archival (defect L2). It does not build a `RestoreFootprint` transaction.                                                                                                                                          |
| **Mobile signing**                                                                    | Freighter is a desktop extension. A phone user reaches "Connect wallet" and the modal offers nothing usable. **Known rough edge, accepted, unhandled.** Reading the marketplace works on mobile; signing does not, and the app will not say so. |
| **Filtering or curating the listing**                                                 | `/app` shows every certificate the registry holds, including junk from e2e runs and visitor experiments. A permissionless registry that fills with weak certificates is telling the truth.                                                      |
| **A guided walkthrough page**                                                         | The flow is discovered by walking the real pages.                                                                                                                                                                                               |
| **A walkthrough video**                                                               | Standing decision; do not re-propose.                                                                                                                                                                                                           |
| **Changing any contract**                                                             | Contract work lives in `iamnotdou/bound`. This repo reads and writes what is deployed.                                                                                                                                                          |

---

## 3. Decisions locked during the interview

1. **Scope** — the four-leg certificate lifecycle. No router, no premiums, no settlement.
2. **USDC** — server faucet plus a wallet-signed trustline step. Anyone can complete the flow.
3. **Faucet key** — a **dedicated pre-funded faucet account that transfers**, not the
   USDC issuer minting. `FAUCET_SECRET` in Vercel holds only test USDC; the
   issuer/deployer key never reaches the server. Leak means "rotate", not "admin over
   the token contract".
4. **Faucet policy** — friendbot the account if it does not exist, per-address cooldown,
   refuse if the trustline is not open yet.
5. **Two actors** — role-aware UI (switch wallets), **plus** an optional server-signed
   demo auditor for people who will not.
6. **Demo auditor honesty** — no invented badge. The demo auditor's address is already
   public in `@bound/sdk`'s committed `accounts`. Wherever that address appears as a
   certificate's auditor, the app says it is operated by boundprotocol.dev and is not an
   independent third party. This applies to the seeded certificates too, which were
   attested by exactly that address.
7. **Transaction state** — a `TxJournal` interface with a localStorage implementation.
   DB later, behind the same interface.
8. **Extra reads** — live reserve balance (non-optional), auditor registration and free
   stake, open claim window / freeze, live allocation vs snapshot, wallet USDC + trustline.
9. **Read split** — cached server shell for chain facts, one client endpoint for
   wallet-scoped facts.
10. **Listing** — server pagination via `searchParams`, no curation.
11. **Errors** — one shared precondition table driving _both_ button gating and error
    translation. Unrecognised errors pass through verbatim, labelled as raw.
12. **Archival (L2)** — detect and explain. No restore transaction.
13. **Publish → fund** — chained in the same session.
14. **Also in scope** — "only mine" filter, auto-refresh after an action lands, landing
    page CTAs pointing at the working flow.
15. **Verification** — vitest for offline logic, `scripts/e2e.ts` against real testnet.
16. **Delivery** — one branch `feat/mvp-e2e`, one conventional commit per milestone,
    one PR at the end.

---

## 4. Files and interfaces

### 4.0 Toolchain

| File                | Change                                                                                                                                                                                                                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package-lock.json` | **Delete.** It resolves `@stellar/stellar-sdk` to 13.3.0 while `@bound/sdk@0.5.0` declares `^16.0.1`; `pnpm-lock.yaml` resolves 16.2.0 correctly. Two lockfiles mean `npm ci` and `pnpm install` build different trees.                                                                                                                           |
| `package.json`      | Add `packageManager: "pnpm@<pinned>"`. Add `@stellar/stellar-sdk@^16.2.0` as a **direct** dependency (the setup script, faucet, demo-auditor route and e2e all need `Keypair`; relying on a transitive hoist is what produced the 13.3.0 tree). Add devDeps `vitest`, `tsx`. Add scripts: `test`, `test:watch`, `typecheck`, `setup:demo`, `e2e`. |

> The installed tree is currently 13.3.0 and live reads still work — verified against
> testnet while writing this. This is latent, not broken. It is fixed first anyway
> because every acceptance command below depends on a reproducible install.

### 4.1 Read layer — `lib/bound.ts` (extend)

Server-only, unchanged in character: still the app's only certificate data source.

```ts
/** Everything about one certificate that the chain can be asked, read live. */
export interface CertFacts {
  cert: CertListItem; // existing shape, unchanged
  reserve: {
    claimedStroops: string; // cert.reserve_amount — a claim
    vaultStroops: string | null; // ReserveVault.get_balance(cert_id) — the fact
  };
  allocation: {
    snapshotStroops: string; // auditor_stake_snapshot, at attest time
    liveStroops: string | null; // AuditorStaking.get_allocation(cert_id), now
  };
  freeze: {
    frozen: boolean; // Registry.is_frozen(cert_id)
    claimFreezeUnix: number | null;
    settlementDeadlineUnix: number | null;
  } | null;
  operator: string | null; // Registry.get_cert_operator(cert_id)
  archived: boolean; // an archival host error was seen for this cert
}

export async function getCertificateFacts(
  certId: number,
): Promise<CertFacts | null>;

export interface CertPage {
  items: CertListItem[];
  page: number; // 1-based
  pageCount: number;
  total: number; // Registry.get_cert_count()
  pageSize: number;
}
export async function listCertificatePage(page: number): Promise<CertPage>;
```

Every added read follows the existing rule in this file: caught individually and degraded
to `null`, never to `0`. "The vault says nothing" and "the vault says none" stay distinct.

New: an archival host error is caught and surfaced as `archived: true` rather than
collapsing into the generic error boundary.

### 4.2 State derivation — `lib/cert-state.ts` (new, pure, no network)

The whole point of putting this in its own module: it is the part vitest can prove.

```ts
export type Lifecycle =
  | "archived" // ledger entry reclaimed (defect L2)
  | "frozen" // a claim window is open against it
  | "invalid" // status Invalid
  | "expired" // past expires_at
  | "verified" // Verified and unexpired — the only acceptable state
  | "pending-funded" // reserve fully funded, awaiting an auditor
  | "pending-partial" // vault holds some but not all of the claim
  | "pending-unfunded"; // vault holds nothing

export interface CertState {
  lifecycle: Lifecycle;
  /** Ordered, so the UI never invents its own precedence. */
  reserveShortfallStroops: string | null; // null when unreadable, not 0
  reserveFundedRatio: number | null;
  allocationSlashed: boolean; // live < snapshot
  demoAuditor: boolean; // auditor === accounts.auditor
  nextStep: "fund" | "attest" | "none";
}

export function deriveCertState(facts: CertFacts, nowUnix: number): CertState;
```

Precedence is fixed and tested: `archived > frozen > invalid > expired > verified > funded

> partial > unfunded`. `nowUnix` is a parameter so the tests are not clock-dependent.

### 4.3 Preconditions and error translation — `lib/preconditions.ts` (new, pure)

One table. Gating before the click and translation after it are derived from it, so they
cannot drift apart.

```ts
export type ActionKey =
  | "publish"
  | "fund"
  | "stake"
  | "attest"
  | "challenge"
  | "faucet"
  | "trustline";

export type GateCode =
  | "ok"
  | "no-wallet"
  | "no-account"
  | "no-trustline"
  | "no-usdc"
  | "insufficient-usdc"
  | "not-operator"
  | "already-funded"
  | "reserve-unfunded"
  | "not-registered"
  | "insufficient-free-stake"
  | "self-attest"
  | "already-attested"
  | "frozen"
  | "expired"
  | "archived"
  | "past-deadline";

export type Gate = { ok: true } | { ok: false; code: GateCode; reason: string };

export interface GateContext {
  address: string | null;
  wallet: WalletFacts | null; // §4.4
  state: CertState | null;
  facts: CertFacts | null;
  amountStroops?: string;
}

export function gate(action: ActionKey, ctx: GateContext): Gate;

/** Recognised contract/host errors → the same GateCode and a plain sentence. */
export function translateContractError(
  raw: string,
  action: ActionKey,
): { code: GateCode; message: string } | null; // null = unrecognised, show raw
```

Unrecognised errors are rendered raw and **labelled as raw**, with the action and cert id
beside them. Never dressed up as a friendly message that may be wrong about the cause.

### 4.4 Wallet capabilities — `lib/wallet-facts.ts` + `app/api/wallet/[address]/route.ts` (new)

The server cannot know the connected address, and `revalidate = 30` would cache one
visitor's balance for everyone. So wallet-scoped facts are one client fetch.

```ts
export interface WalletFacts {
  address: string;
  accountExists: boolean; // Horizon 404 ⇒ friendbot needed
  xlmBalance: string | null;
  trustlineOpen: boolean;
  usdcStroops: string | null;
  auditor: {
    registered: boolean;
    minStakeStroops: string;
    freeStakeStroops: string;
    allocatedStroops: string;
  } | null;
  isDemoAuditor: boolean;
}
```

`GET /api/wallet/:address?certId=N` → `{ facts: WalletFacts, gates: Record<ActionKey, Gate> }`

One Horizon `/accounts/{address}` call covers existence, XLM, trustline and USDC together
(verified: the classic asset is `USDC` issued by the operator, and the SAC wraps it).
Auditor facts are three Soroban reads. `Cache-Control: no-store`.

### 4.5 Write layer — `lib/tx.ts` (extend)

`WALLET_ACTIONS` is currently `satisfies readonly WalletAction[]`, typed against the SDK —
so `"deposit"` cannot simply be added to it. Instead:

```ts
/** Actions the SDK builds, plus the ones this app builds itself. */
export type AppAction = WalletAction | "deposit" | "trustline";

export const APP_ACTIONS: readonly AppAction[];
export function isAppAction(v: unknown): v is AppAction;

/** Delegates to the SDK where it can; builds locally where it cannot. */
export async function buildAppActionXdr(
  action: AppAction,
  address: string,
  params: AppBuildParams,
): Promise<string>;
```

- `"deposit"` → `ReserveVaultClient.deposit({ cert_id, amount })`, built here from the
  **exported** `ReserveVaultClient`. Authenticates against `Registry::get_cert_operator`,
  so only that certificate's operator can fund it — no extra check needed on our side,
  but `gate()` states the rule before the click.
- `"trustline"` → the SDK's existing `buildTrustlineXdr(address)`. Classic, not Soroban;
  `submitSignedXdr` already routes classic envelopes to Horizon.
- Everything else → the SDK's `buildActionXdr`, unchanged.

`app/api/tx/build/route.ts` swaps `isWalletAction` for `isAppAction` and runs the raw
error through `translateContractError` before responding:
`{ error, code, raw }` — so the client can show the sentence and keep the raw string.

New: `app/api/tx/[hash]/route.ts` → `GET` returns `{ hash, status: "SUCCESS" | "FAILED" | "NOT_FOUND", result }`.
This is what the journal reconciles against.

### 4.6 Transaction journal — `lib/tx-journal.ts` + `lib/use-tx-journal.ts` (new)

```ts
export interface JournalEntry {
  hash: string;
  action: AppAction;
  certId: number | null;
  address: string;
  submittedAtUnix: number;
  status: "pending" | "success" | "failed";
}

export interface TxJournal {
  put(entry: Omit<JournalEntry, "status">): void;
  pending(): JournalEntry[];
  settle(hash: string, status: "success" | "failed"): void;
  forget(hash: string): void;
}

export const localJournal: TxJournal; // now
// export const serverJournal: TxJournal;    // later, when the DB lands
```

The hash is written **before** submit. On mount, `useTxJournal()` re-reads every pending
hash through `/api/tx/[hash]` and resolves it. This is what fixes the current lie: the
submit route stops polling at 30s and reports "the network rejected the transaction" for a
transaction that in fact landed. Forms call the hook, never `localStorage`.

### 4.7 Components

New under `components/app/`:

| Component                  | Responsibility                                                                                                                                                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `action-button.tsx`        | A button that takes a `Gate`. Disabled renders the reason inline. Every capital action goes through it.                                                                                                                            |
| `wallet-setup.tsx`         | The three preparation steps — fund account (friendbot via faucet), open trustline (wallet-signed), get USDC (faucet) — each shown only when its gate says it is needed.                                                            |
| `reserve-panel.tsx`        | Claimed vs live vault balance, shortfall, ratio, and the Fund action. Replaces the "Reserve" `CapitalCard`'s current unqualified caption.                                                                                          |
| `attest-panel.tsx`         | Auditor's view: registration, free stake, an allocation amount input bounded by free stake, and the Attest action. Plus the demo-auditor shortcut button when the connected wallet cannot attest.                                  |
| `auditor-console.tsx`      | `/app/auditor` — stake/free/allocated, a Stake action, and the certificates awaiting attestation.                                                                                                                                  |
| `demo-auditor-note.tsx`    | Rendered wherever `accounts.auditor` appears as a certificate's auditor. States plainly that this address is operated by boundprotocol.dev, that its capital is real and slashable, and that it is not an independent third party. |
| `pending-transactions.tsx` | Journal banner: what is in flight, what resolved, restored across reloads.                                                                                                                                                         |
| `archived-notice.tsx`      | The L2 state, with a link to the disclosure.                                                                                                                                                                                       |

Changed:

| File                                          | Change                                                                                                                                                                                  |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/app/marketplace.tsx`              | Server pagination controls; "only mine" toggle; counts phrased as "of the N on this page"; demo-auditor marker on rows.                                                                 |
| `components/app/publish-certificate-form.tsx` | Success card becomes step 2 — cert id, `$0 / $claimed`, and a Fund action reusing `reserve-panel`'s mutation. "Later →" still available.                                                |
| `app/(app)/app/cert/[certId]/page.tsx`        | Renders from `CertFacts` + `CertState`. Reserve card gains claimed-vs-live. Frozen and archived states. Guarantees panel keys off `CertState.lifecycle` rather than `cert.valid` alone. |
| `app/(app)/app/page.tsx`                      | `searchParams` pagination.                                                                                                                                                              |
| `app/(app)/app/actions.ts`                    | `revalidateMarketplace` also revalidates `/app/auditor`.                                                                                                                                |
| `app/(landing)/(home)/*`                      | CTAs pointing at the working flow.                                                                                                                                                      |

New routes: `app/(app)/app/auditor/page.tsx`.

### 4.8 Server-signed endpoints

| Route                     | Key              | Behaviour                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/api/faucet/route.ts` | `FAUCET_SECRET`  | `POST { address }`. Friendbot if the account does not exist → 400 if the trustline is not open, naming the next step → 429 with a retry time if within cooldown → otherwise transfer a fixed USDC amount, return `{ hash }`. Cooldown is in-memory per instance; **this is imperfect on serverless and the response says so** rather than implying a guarantee. |
| `app/api/attest/route.ts` | `AUDITOR_SECRET` | `POST { certId, allocationUsd }`. Signs `attest` as the demo auditor. Refuses if the reserve is unfunded, if already attested, or if the demo auditor lacks free stake — each with the same `GateCode` the UI would have shown.                                                                                                                                 |

Neither key is the USDC issuer or the deployer. Both are documented in `README.md` and
`.env.example`.

### 4.9 Scripts

`scripts/setup-demo.ts` — idempotent, reads `OPERATOR_SECRET` from the local environment
only. Checks what exists before doing anything; safe to re-run. Creates/tops up the faucet
account, ensures the demo auditor has free stake, prints the two secrets and the exact
`vercel env add` commands. Never run in CI, never on the server.

`scripts/e2e.ts` — §6.

---

## 5. Milestones

One branch, `feat/mvp-e2e`, one conventional commit per milestone. Each acceptance command
exits 0 on success and non-zero on failure, and each milestone is independently revertible.

Commands assume pnpm (see §4.0). `pnpm test` is vitest; `pnpm e2e` needs a dev server and
network.

---

### M0 — `chore: put the toolchain on one lockfile and add vitest`

Delete `package-lock.json`; pin `packageManager`; add `@stellar/stellar-sdk` as a direct
dependency; add vitest + tsx; add the scripts. No behaviour change.

**Acceptance**

```bash
test ! -f package-lock.json \
  && pnpm install --frozen-lockfile \
  && node -e "
      const { readFileSync } = require('node:fs');
      const v = JSON.parse(readFileSync('node_modules/@stellar/stellar-sdk/package.json','utf8')).version;
      if (!v.startsWith('16.')) { console.error('stellar-sdk resolved to ' + v + ' — expected 16.x'); process.exit(1); }
      console.log('stellar-sdk ' + v);" \
  && pnpm exec tsc --noEmit \
  && pnpm lint \
  && pnpm test
```

(`@stellar/stellar-sdk`'s `exports` map does not expose `./package.json`, so the version
check reads the file directly rather than through `require`.)

---

### M1 — `feat: read what the chain actually holds for a certificate`

`lib/bound.ts` gains `getCertificateFacts` and `listCertificatePage`. `lib/cert-state.ts`
lands with `deriveCertState`. Vitest covers the precedence order, the null-vs-zero rule,
the shortfall arithmetic and the slashed-allocation case. No UI change yet.

**Acceptance**

```bash
pnpm test -- cert-state \
  && pnpm exec tsc --noEmit \
  && pnpm exec tsx scripts/check-reads.ts
```

`scripts/check-reads.ts` asserts against live testnet, using the fixtures that exist today:

- cert **#1** — `Verified`, `valid=true`, vault balance **> 0**, `deriveCertState → "verified"`
- cert **#2** — `Pending`, vault balance **exactly 0**, `deriveCertState → "pending-unfunded"`
- cert **#5** — `Verified` but expired, `deriveCertState → "expired"`
- `listCertificatePage(1).total === Registry.get_cert_count()`

Exits 1 on any mismatch. This is the milestone that proves the claimed-vs-live gap is
closed, and it needs no new on-chain state to do it.

---

### M2 — `feat: tell a wallet what it may do before it signs`

`lib/preconditions.ts`, `lib/wallet-facts.ts`, `app/api/wallet/[address]/route.ts`,
`components/app/action-button.tsx`. `/api/tx/build` returns translated errors. Existing
publish and challenge forms move onto `ActionButton`. Nothing new is transactable.

**Acceptance**

```bash
pnpm test -- preconditions \
  && pnpm exec tsc --noEmit \
  && pnpm exec tsx scripts/check-gates.ts
```

`scripts/check-gates.ts` runs against a dev server and asserts:

- `GET /api/wallet/<demo auditor>?certId=2` → `gates.attest.code === "reserve-unfunded"`
- `GET /api/wallet/<fresh keypair>` → `accountExists === false`, `gates.stake.code === "no-account"`
- `GET /api/wallet/<operator>?certId=1` → `gates.fund.code === "already-funded"`
- every `GateCode` in the table is produced by at least one vitest case (coverage assertion)

---

### M3 — `feat: get a fresh wallet from nothing to spendable USDC`

`scripts/setup-demo.ts`, `app/api/faucet/route.ts`, the `"trustline"` app action,
`components/app/wallet-setup.tsx`. First new chain writes.

**Acceptance**

```bash
pnpm exec tsc --noEmit \
  && pnpm test \
  && pnpm exec tsx scripts/e2e.ts --through=usdc
```

`--through=usdc` generates a fresh keypair, calls the faucet, signs the trustline locally,
calls the faucet again, and asserts the address holds the expected USDC on Horizon. Also
asserts the second faucet call inside the cooldown returns **429**.

---

### M4 — `feat: fund a certificate's reserve`

The `"deposit"` app action, `components/app/reserve-panel.tsx`, the chained fund step on
the publish success card, and the certificate page rendering claimed vs live.

**Acceptance**

```bash
pnpm exec tsc --noEmit \
  && pnpm test \
  && pnpm exec tsx scripts/e2e.ts --through=fund
```

Extends the walk: publish a certificate as the fresh wallet (self-bonded), assert it reads
`Pending` with vault `0`, fund it, assert `vaultStroops === claimedStroops` and
`deriveCertState → "pending-funded"`. Also asserts a **second** wallet attempting to fund
the same certificate is refused with `not-operator` and that nothing was signed.

---

### M5 — `feat: stake as an auditor and attest a funded certificate`

`app/(app)/app/auditor/page.tsx`, `components/app/auditor-console.tsx`,
`components/app/attest-panel.tsx`, `components/app/demo-auditor-note.tsx`,
`app/api/attest/route.ts`. This is the milestone that first reaches Verified.

**Acceptance**

```bash
pnpm exec tsc --noEmit \
  && pnpm test \
  && pnpm exec tsx scripts/e2e.ts --through=verified
```

Extends the walk: a second fresh wallet gets USDC, stakes above `min_stake`, attests the
funded certificate with an explicit allocation, and the certificate reads
`Verified · valid=true` with `allocation.liveStroops` equal to the allocation. Also asserts
attesting the **unfunded** cert #2 is refused with `reserve-unfunded`, and that a page
rendering `accounts.auditor` as auditor includes the demo-auditor disclosure text.

---

### M6 — `feat: survive reloads, pagination, and the states nobody wants to see`

`lib/tx-journal.ts` + `useTxJournal`, `app/api/tx/[hash]/route.ts`,
`components/app/pending-transactions.tsx`, `components/app/archived-notice.tsx`,
marketplace pagination + "only mine", auto-refresh after an action lands, landing CTAs.

**Acceptance**

```bash
pnpm exec tsc --noEmit \
  && pnpm lint \
  && pnpm test -- tx-journal \
  && pnpm build \
  && pnpm exec tsx scripts/check-states.ts
```

`scripts/check-states.ts` asserts against a running server:

- `/app?page=1` and `/app?page=2` return 200 and disjoint cert ids when `total > pageSize`
- `/api/tx/<a known-good hash>` → `SUCCESS`; `/api/tx/<64 zeros>` → `NOT_FOUND` (not an error)
- `/app/cert/999999` → 404
- `/app/cert/2` HTML contains both the claimed figure and the live `$0`
- the journal round-trips `put → pending → settle` under vitest with a fake `localStorage`

---

## 6. End-to-end verification

```bash
pnpm dev &                       # or BASE_URL=https://www.boundprotocol.dev
pnpm exec tsx scripts/e2e.ts
echo "exit: $?"
```

The script holds no committed key. It generates **two ephemeral keypairs per run** and
drives the app's own HTTP routes — the same routes the browser uses — signing locally with
`@stellar/stellar-sdk` in place of the wallet extension. That is legitimate because the
only browser-specific step in the whole write path is the signature itself; build and
submit are server routes.

```
  ✓ operator G…7Q2 : friendbot funded, 10000.0 XLM
  ✓ operator       : trustline open (USDC / GDOUNK…7HGF)
  ✓ operator       : faucet transferred $10,000
  ✓ faucet cooldown: second call → 429
  ✓ published cert #14 — Pending, vault $0 / $1,000 claimed
  ✓ wrong wallet   : fund refused (not-operator), nothing signed
  ✓ reserve funded : $1,000 / $1,000 — pending-funded
  ✓ auditor  G…J4A : friendbot + trustline + $10,000
  ✓ auditor        : staked $2,000, free $2,000, registered
  ✓ attest cert #2 : refused (reserve-unfunded)
  ✓ attested #14   : allocation $1,000
  ✓ cert #14       : Verified · valid=true · live allocation $1,000
  ✓ GET /app/cert/14 → 200, renders "Verified"
  exit 0
```

Every assertion is a live chain read after the fact, not the transaction's own return
value. The last step fetches the rendered page, because the standing lesson in this
project — hit three times at three layers — is that typecheck-clean is not works, and a
green build says nothing about whether the page tells the truth.

**Flags:** `--through=<usdc|fund|verified>` stops early (used by M3–M5).
`--base-url=<url>` targets a deployment. Default `http://localhost:3000`.

**Cost per full run:** one new certificate on shared testnet, two throwaway accounts, and
roughly $12,000 of the faucet's test USDC. Accepted — §2 says the listing shows everything.

---

## 7. Assumptions and open questions

### Assumptions I made

1. **pnpm becomes the package manager.** `pnpm-lock.yaml` resolves `@stellar/stellar-sdk`
   correctly at 16.2.0; `package-lock.json` resolves 13.3.0. Deleting the npm lock is the
   smaller change. **Override this if the Vercel project is configured for npm** — it
   changes the install line in every acceptance command above and nothing else.
2. **The current 13.3.0 tree is latent, not broken.** I verified live reads work today.
   Nothing in this spec depends on it staying that way.
3. **Faucet amount $10,000, cooldown 1 hour, per address.** Round numbers, easily changed.
4. **The demo auditor keeps using `accounts.auditor`** (`GCNDTX…SMEF`), which already
   attested certs #1 and #3–#5. So the demo-auditor disclosure appears on the seeded
   certificates too — correct, and worth expecting before it surprises anyone.
5. **The auditor chooses their allocation explicitly.** `buildActionXdr` defaults it to
   $500; a defaulted number is the auditor not pricing their own risk, which is the one
   thing attestation is for. The field is required in the UI, bounded by free stake.
6. **In-memory faucet cooldown.** On serverless this resets per instance and is not a
   real rate limit. Stated in the response rather than implied away. A durable limiter
   arrives with the database.
7. **Auto-refresh means re-reading the affected certificate**, not polling. It fires once
   a journal entry settles.
8. **Landing CTA changes are copy and links only** — no restructuring of the `(landing)`
   route group.

### Open questions

1. **Does anything need to happen to the existing seeded certificates?** #3, #4 and #5 are
   `Verified` but expired, and will read as `expired` in the new state model — more
   visibly than they do today. Leave them as a demonstration of expiry, or publish fresh
   ones? I would leave them: an expired certificate is a state the app should show.
2. **Should `pnpm e2e` run in CI?** It needs network, mutates shared testnet, and consumes
   faucet USDC. My assumption is **no** — local and pre-deploy only, with CI running
   `typecheck + lint + test + build`. Say if you want it gated on a label instead.
3. **Faucet refill.** The faucet account will drain. Nothing here monitors it, and when it
   empties the whole write path dies for new users with a confusing error. The `no-usdc`
   gate on the _faucet's own_ balance would catch it — worth adding to M3 if you want the
   app to say "the faucet is empty" rather than fail mid-transfer.
4. **`deposit-fee` and `pay`** are in `WALLET_ACTIONS` with no UI and no use in this MVP
   (`FeeEscrow` is deployed-but-dead per defect L3). Leave them exposed on the build
   endpoint, or drop them from the allowlist?

### Risks worth naming

- **The faucet is a public endpoint signing with a key.** The key holds only test USDC and
  the account is disposable, but the endpoint is reachable by anyone and the cooldown is
  weak. This is the largest new attack surface in the MVP and it is deliberate.
- **Shared testnet is not ours.** Another party can publish, expire or challenge
  certificates between an e2e run's steps. The script asserts against ids it created, not
  against global counts, for exactly this reason.
- **Defect L2 is unfixed.** Every certificate published through this MVP is on an archival
  clock. M6 makes that legible; it does not make it stop.
- **`gate()` and the contract can disagree.** The gate reads a cached shell; the contract
  simulates now. The error translation exists because that race is real, not hypothetical.
