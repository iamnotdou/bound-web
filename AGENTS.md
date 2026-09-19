<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# bound-web — the app

Next.js 16 App Router, React 19, Tailwind v4, shadcn. Two route groups:
`(landing)` is marketing, `(app)` is the live marketplace at `/app`. Every chain
fact comes from `@bound/sdk`, installed **from npm** — the contracts live in the
sibling `bound` repo and this app holds no address of its own.

## Definition of done

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

There is no `verify` script and no CI workflow: the Vercel build is the gate, so
run `pnpm build` before pushing. Prettier runs on staged files via `lint-staged`
and is not otherwise enforced.

`pnpm test` is offline and covers only the pure modules (`lib/cert-state.ts`,
`lib/preconditions.ts`, `lib/tx-journal.ts`, `lib/toolchain.test.ts`). Everything
that reaches Stellar is proved by `scripts/*.ts` against live testnet instead,
because a mocked chain only asserts that the mock matches the code that wrote it.

`scripts/e2e.ts` and the `scripts/check-*.ts` runs need live testnet, and all but
`check:anchor` also need a running `pnpm dev`; a full `e2e` run publishes a real
certificate and spends faucet USDC. `pnpm check:anchor` is read-only and free —
it signs nothing. `pnpm setup:demo` is **local only**: it reads the
operator/issuer key.

## Map

| Path                   | What it is                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| `lib/bound.ts`         | The only certificate reader. Server only                                                     |
| `lib/tx.ts`            | The only write-path door onto the SDK. Server only                                           |
| `lib/wallet-facts.ts`  | One connected wallet, read live off Horizon + staking. Server only                           |
| `lib/faucet.ts`        | The test-asset faucet's account. Server only                                                 |
| `lib/anchor.ts`        | The fiat boundary: SEP-1 discovery, SEP-10 auth, SEP-24 transfer. Server only                |
| `lib/preconditions.ts` | The gate table — may this wallet do this, and why not                                        |
| `lib/cert-state.ts`    | `deriveCertState` — what a certificate _is_. Pure                                            |
| `lib/tx-journal.ts`    | What this browser has in flight, written before it is sent                                   |
| `lib/wallet/`          | Wallets Kit init, connection context, and the build→sign→submit hooks                        |
| `lib/deployment.ts`    | `@bound/sdk/deployments` — addresses only, safe on both sides                                |
| `app/api/`             | Route handlers: `tx/*`, `wallet/[address]`, `challenge/[id]`, `faucet`, `attest`, `anchor/*` |
| `components/app/`      | The `(app)` group's components. Everything else under `components/` is landing               |
| `scripts/`             | Live-testnet acceptance runs over a shared reporter (`report.ts`)                            |

## The eight rules this app is built on

**1. The server/client line is load-bearing.** `lib/bound.ts`, `lib/tx.ts`,
`lib/faucet.ts` and `lib/wallet-facts.ts` construct SDK clients and read
`STELLAR_NETWORK`; importing one from a Client Component breaks the browser
bundle. Client code takes `lib/deployment.ts` (a frozen JSON object) for
addresses, plus plain values and types passed down from a Server Component. Each
of those four files says `SERVER ONLY` at the top — keep that marker.

**2. A failed read degrades to `null`, never to `0`.** "The vault said nothing"
and "the vault says none" are different claims and the UI must tell them apart.
Every chain read in `getCertificateFacts`, `getCertificateActivity` and
`readWalletFacts` is caught on its own. Anything rendering a figure keys off the
nullable field, never off the lifecycle. `SpendMeterPanel` and `CoveragePanel`
render a _different shape_ per case rather than one shape with blanks.

**3. One gate table.** `lib/preconditions.ts` answers both "may this wallet act?"
(before the click, via `GET /api/wallet/[address]`) and "why did the contract
refuse?" (after, via `translateContractError`) — same `GateCode`, so the button
and the error can never disagree. It is pure and takes `nowUnix` as a parameter
so the whole table is provable. Every capital action renders through
`components/app/action-button.tsx`, which takes a `Gate` rather than a `disabled`
boolean. Adding an action means touching `ActionKey`/`ACTION_KEYS`,
`GateCode`/`GATE_CODES`, and `asActionKey` in `app/api/tx/build/route.ts`.

**4. One lifecycle derivation.** `deriveCertState` and the fixed
`LIFECYCLE_PRECEDENCE` (`archived > frozen > invalid > expired > verified >
funded > partial > unfunded`). Nothing invents its own ordering, and an
unreadable vault falls to the state that grants the least.

**5. Money is integer stroops.** `formatUsdcExact` and `ratioPercent` in
`components/app/usdc.ts`, never a float divide — `formatUsdc` from the SDK
renders a live premium accrual as `$0`, which reads as "no yield". `tsconfig`
targets ES2020 for BigInt literals for exactly this reason.

**6. Cached shell, uncached wallet.** Server pages carry
`export const revalidate = 30` for chain facts that are the same for everyone.
Anything wallet-specific is a `no-store` route handler (`dynamic =
"force-dynamic"` plus a `cache-control: no-store` header). Serving one visitor's
balance to the next is the worst kind of wrong number. After a write lands, the
Server Action in `app/(app)/app/actions.ts` revalidates the affected paths.

**7. The write path keeps its stages apart.** `build → sign → submit`, with the
stage attached to every failure (`WalletActionError`). The browser never carries
a network passphrase — it comes back with the envelope. `assertSignableXdr`
re-simulates the assembled envelope and refuses one needing a stranger's
signature, because `AssembledTransaction.toXDR()` happily serialises an assembly
whose simulation failed. The signed hash is written to the journal **before**
submit, so `/api/tx/submit` giving up after 30 seconds is never reported as a
rejection — `GET /api/tx/[hash]` asks the chain instead, and `NOT_FOUND` there is
a status, not an error.

**8. The anchor is configuration, and its challenge is verified.** No anchor
endpoint is written into this app: `ANCHOR_HOME_DOMAIN` names one and every URL
comes out of its `stellar.toml` over SEP-1, so pointing at a lira anchor is a
config change rather than a diff. Before a SEP-10 challenge reaches a wallet the
server proves it is genuinely the anchor's — `WebAuth.readChallengeTx` against
the declared `SIGNING_KEY`, sequence zero, the right home domain. That is the
anchor-side `assertSignableXdr`: a wallet approval dialog is the last place to
discover that a third party sent a payment operation instead of a challenge. The
token it earns is a credential — it lives in a ref for the length of the flow,
keyed by the address it authenticates, and never in storage.

## Secrets

Two, and only on the server:

- `FAUCET_SECRET` — a dedicated, disposable account that _transfers_ test USDC.
  Not the issuer: a leak costs its balance and is fixed by rotating the key.
- `AUDITOR_SECRET` — boundprotocol.dev's own auditor, for `/api/attest`. It must
  equal `accounts.auditor` in the committed deployment or the route refuses to
  sign. Every certificate it touches renders `DemoAuditorNote`.

`OPERATOR_SECRET` is the issuer and the operator of every seeded certificate. It
is read by `scripts/setup-demo.ts` alone, it runs locally, and it must never
reach Vercel or CI. No route handler touches it.

## Conventions worth knowing before you write code

- Route and page param types come from Next's generated globals —
  `PageProps<"/app/cert/[certId]">`, `RouteContext<"/api/tx/[hash]">`,
  `LayoutProps<"/">`. Do not hand-write them.
- Read the clock through `nowUnix()` (`lib/clock.ts`). `Date.now()` in a
  component body is an impure call during render.
- `/docs` and `/docs/*` redirect to `docs.boundprotocol.dev` from
  `next.config.ts`. That redirect is the only place that knows where docs live.
- Tailwind v4 is CSS-first: tokens live in `app/globals.css` under `@theme` and
  `:root` / `.dark`. `.font-address` is a true monospaced stack for chain
  addresses, which the Outfit-based `--font-mono` token is not.
- shadcn is configured in `components.json` (style `radix-mira`, hugeicons,
  `@tailark-pro` and `@react-bits` registries).
- Copy is written to be checkable. The app states what it cannot do — "pending is
  not cover", "spend is gross flow, not loss", the faucet cooldown is "a courtesy
  rather than a rate limit". Match that register; do not upgrade a caveat into a
  promise.

## Connections

- `@bound/sdk` comes from npm at `^0.5.0`, alongside `@stellar/stellar-sdk` 16.
  `lib/toolchain.test.ts` asserts both this app and the SDK resolve
  `@stellar/stellar-sdk` on 16.x — a second lockfile once resolved 13.3.0 and
  only one of those trees can build the envelopes a wallet is asked to sign.
- Contract changes land in the sibling `bound` repo, then reach here through a
  published SDK version. Bumping `@bound/sdk` is how a new deployment arrives.
- Docs are a separate deploy (`bound-docs`); this repo only redirects to them.
