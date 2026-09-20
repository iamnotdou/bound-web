# bound-web

The marketing site and application for **Bound Protocol** — a surety bond for AI
agents on Stellar. An operator publishes a certificate carrying a _bound_ (the
maximum loss covered), funds its _reserve_, and a third-party _auditor_ stakes
slashable capital attesting to it. Anyone can verify a certificate, and anyone
can challenge one.

- `app/(landing)` — the marketing site
- `app/(app)` — the application, at `/app`
- Docs live in a separate deploy; `/docs` redirects there via `next.config.ts`

## Development

This repo uses **pnpm**. There is one lockfile and it is `pnpm-lock.yaml`;
`package-lock.json` was deleted because it resolved `@stellar/stellar-sdk` to
13.3.0 while `@bound/sdk` requires `^16.0.1`, so the two lockfiles built
different, incompatible trees.

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm typecheck    # tsc --noEmit
pnpm lint
pnpm test         # vitest, offline only
pnpm build
```

Copy `.env.example` to `.env.local` before running anything that signs.

## The application

| Route                | What it does                                                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `/app`               | Marketplace. Every certificate the registry holds, paginated via `?page=`, with search, status filter, hide-expired and only-mine.  |
| `/app/cert/[certId]` | One certificate: claimed vs live reserve, live auditor allocation, fund and attest controls, challenge control, and what it proves. |
| `/app/new`           | Wallet setup, then publish a certificate and fund its reserve in the same session.                                                  |
| `/app/auditor`       | Stake, see what is free, and attest certificates whose reserves are actually funded.                                                |

### The four legs

```
publish  →  fund reserve  →  auditor stakes  →  auditor attests  →  Verified
```

A stranger with a browser wallet and no testnet assets can walk all four in one
sitting: `/app/new` hands the wallet test XLM through friendbot, the wallet
signs its own USDC trustline, the faucet sends test USDC, and from there the
publish and fund steps are the wallet's own signatures. The last leg needs a
second party — either a wallet that has staked as an auditor, or
boundprotocol.dev's own demo auditor (see below).

### Claimed is not held

Publishing records a **claimed** reserve: a number on the certificate, with no
money behind it. `/app/cert/[certId]` reads `ReserveVault.get_balance` live and
shows both figures side by side, along with the shortfall. An auditor cannot
attest a certificate whose vault does not hold what it claims, and the gate says
so before anyone signs.

Everywhere in this app, an unreadable value renders as unreadable and never as
zero. "The vault says nothing" and "the vault says none" are different claims.

### How writes work

No secret key is involved in a wallet-signed action. The server builds an
unsigned envelope, **re-simulates it as assembled**, and returns it; the browser
wallet signs it in the extension; the server submits it.

The re-simulation matters. `AssembledTransaction.toXDR()` serialises whatever
was assembled, _including an assembly whose simulation failed_ — verified
against the deployed contracts, where attesting an unfunded certificate and
funding somebody else's reserve both produced well-formed, unsignable envelopes.
`assertSignableXdr` in `lib/tx.ts` is what refuses them.

`lib/bound.ts` is the only module that knows where certificate data comes from,
and `lib/tx.ts` is the only door to the write path. Both are server-only.

Certificates are listed **by certificate id, never by agent address**: an
agent's mapping names its _current_ certificate rather than all of them.

### The transaction journal

`/api/tx/submit` gives up polling after thirty seconds and used to report that
as "the network rejected the transaction" — for transactions that had landed.
The browser now computes the envelope's hash before submitting, writes it to
`lib/tx-journal.ts`, and re-reads every pending hash through `/api/tx/[hash]` on
mount. `NOT_FOUND` is a status, not a failure.

## The fiat boundary

`/app/fiat` is where value crosses between a bank account and Stellar, through a
SEP-24 anchor. It matters more than it looks: a surety bond whose collateral
cannot be funded from, or redeemed to, money people actually spend is not a
bond. This is the edge the protocol is only useful across.

| Step   | What happens                                                                                                                                                                                                                                                                                                                                                                                     |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SEP-1  | Every endpoint is read from the anchor's `stellar.toml`. Nothing is hardcoded — `ANCHOR_HOME_DOMAIN` names the anchor and `ANCHOR_ASSET_CODE` the asset, so pointing at a lira anchor is configuration rather than a diff. The toml also decides **which rail**: an anchor that publishes `TRANSFER_SERVER_SEP0024` is driven over SEP-24, one that publishes only `TRANSFER_SERVER` over SEP-6. |
| SEP-10 | The connected wallet signs the anchor's challenge, through the same Wallets Kit path every other write uses.                                                                                                                                                                                                                                                                                     |
| SEP-24 | An interactive deposit **or withdrawal** opens in the anchor's own hosted window. Both directions, because a reserve funded from fiat is half a rail if a proven claim cannot be paid back out.                                                                                                                                                                                                  |

### The challenge is verified before your wallet sees it

We ask you to sign a transaction fetched from a third party, so the server
proves it is genuinely a SEP-10 challenge first: sequence zero, sourced by the
`SIGNING_KEY` the anchor publishes, carrying the right home domain, already
signed by the anchor, and minted for _your_ account rather than someone else's.
Anything else is refused and never reaches a wallet — a signing prompt is the
last place that question should be settled.

One subtlety worth repeating, because it is silently wrong the other way:
SEP-10's `web_auth_domain` is the host of `WEB_AUTH_ENDPOINT`, **not** the home
domain. They coincide on the SDF reference anchor, so validating against the
home domain looks correct until you point at an anchor that serves auth
elsewhere, and then every challenge is rejected.

### Which money the reserve holds — two instances

The default deployment holds a self-issued test USDC while the anchor issues its
own, and they are different money: there, a completed deposit funds your wallet
and **cannot** fund a certificate's reserve. `GET /api/anchor` compares the two
issuers and returns `fundsReserve`; the panel leads with that, above the
controls, rather than letting a demo imply otherwise.

The second deployment closes that gap by being denominated in the anchor's own
USDC, so a reserve there holds money that crossed a fiat rail to get in.

| `NEXT_PUBLIC_STELLAR_NETWORK` | Reserves hold              | `fundsReserve` | Test money comes from |
| ----------------------------- | -------------------------- | -------------- | --------------------- |
| `testnet` (default)           | USDC the operator issues   | `false`        | `/api/faucet`         |
| `testnet-anchor`              | USDC **the anchor issues** | `true`         | a SEP-24 deposit      |

Both are live on testnet and neither replaces the other. The default is what
boundprotocol.dev serves: it carries the seeded certificates and a faucet that
can hand a visitor test money. On the anchor instance there is no faucet worth
the name — the anchor is where money comes from, which is the point of it, and
the amount in existence is whatever has been deposited.

Selecting one is two environment variables that must agree: `STELLAR_NETWORK`
for the server and `NEXT_PUBLIC_STELLAR_NETWORK` for the browser bundle.
`lib/bound.ts` compares the registry address the two halves resolved and throws
at build time if they differ, because a page that renders one deployment's
addresses beside another's figures is wrong in a way nobody would notice.

`pnpm check:anchor` prints the whole picture against the live anchor: the
discovered endpoints, the limits, a fetched-and-validated challenge, a tampered
one being refused, and the two issuers side by side. It signs nothing, moves
nothing, and is free to run.

## Server-signed endpoints

Two, and both hold keys that are worth only what they hold.

| Route         | Key              | What it does                                                                                            |
| ------------- | ---------------- | ------------------------------------------------------------------------------------------------------- |
| `/api/faucet` | `FAUCET_SECRET`  | Friendbots an address with no account; otherwise transfers test USDC from the faucet's **own** balance. |
| `/api/attest` | `AUDITOR_SECRET` | Signs `attest` as boundprotocol.dev's own auditor, for visitors who will not stand up a second wallet.  |

Neither is the USDC issuer and neither is the deployer. `OPERATOR_SECRET` — the
issuer key — is read by `scripts/setup-demo.ts` **and nothing else**, it runs
locally, and it must never be added to Vercel or to CI.

The faucet reads its own balance before it starts a transfer, so an empty faucet
says "the faucet is empty" rather than failing halfway. Its per-address cooldown
is in-memory, which on serverless resets per instance — the response says so
rather than implying a rate limit nothing here can enforce.

### The demo auditor

`accounts.auditor` in `@bound/sdk`'s committed deployment record is operated by
boundprotocol.dev. Its capital is real testnet stake and genuinely slashable,
but it is **not an independent third party**, and every place it appears as a
certificate's auditor carries a disclosure saying so — including the seeded
certificates it attested before this app existed. There is no badge.

## Setup and verification

```bash
pnpm setup:demo                      # local only; needs OPERATOR_SECRET + AUDITOR_SECRET
pnpm dev &
pnpm exec tsx scripts/check-reads.ts   # live reads vs the seeded fixtures
pnpm exec tsx scripts/check-gates.ts   # preconditions, against a dev server
pnpm exec tsx scripts/check-states.ts  # pagination, tx lookup, claimed vs live
pnpm e2e                               # the whole walk, on live testnet
```

`scripts/e2e.ts` generates two ephemeral keypairs per run and drives the app's
own HTTP routes, signing locally in place of the wallet extension. Every
assertion is a live chain read _after_ the fact, never a transaction's own
return value. `--through=usdc|fund|verified` stops early; `--base-url=` targets
a deployment.

It costs one new certificate on shared testnet, two throwaway accounts, and
about $20,000 of the faucet's test USDC per run. That is the intended price —
the registry is permissionless and the listing shows everything, including the
junk this leaves behind.

## Stack

Next.js 16 (App Router), React 19, Tailwind v4, shadcn, Outfit, primary `#FF5400`.

## The repositories

|                                                         |                                                                                      |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [`bound`](https://github.com/iamnotdou/bound)           | contracts, SDK, MCP connector, demo scripts                                          |
| [`bound-web`](https://github.com/iamnotdou/bound-web)   | the marketing site and the app at [boundprotocol.dev](https://www.boundprotocol.dev) |
| [`bound-docs`](https://github.com/iamnotdou/bound-docs) | the documentation site at [docs.boundprotocol.dev](https://docs.boundprotocol.dev)   |

Published packages: [`@bound/sdk`](https://www.npmjs.com/package/@bound/sdk) ·
[`@bound/mcp`](https://www.npmjs.com/package/@bound/mcp)

## License

MIT — see [LICENSE](./LICENSE).
