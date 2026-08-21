# bound-web

The marketing site and application for **Bound Protocol** — a surety bond for AI
agents on Stellar. An operator publishes a certificate carrying a _bound_ (the
maximum loss covered), a pre-funded _reserve_, and a third-party _auditor_ who
stakes slashable capital attesting to it. Anyone can verify a certificate, and
anyone can challenge one.

- `app/(landing)` — the marketing site
- `app/(app)` — the application, at `/app`
- Docs live in a separate deploy; `/docs` redirects there via `next.config.ts`

## ⚠️ `npm install` currently fails

```
npm error code ETARGET
npm error notarget No matching version found for @bound/sdk@^0.2.0
```

This is expected and there is exactly one fix. The app needs `@bound/sdk@0.2.0`
for `listCertificates`, `getCertificate` and the transaction builders. Only
`0.1.0` is on the registry, and that version is unusable by anyone: it was
published without its `dist/` directory, so the tarball contains no code.

Until `0.2.0` is published, `package-lock.json` is stale — it still records
`0.1.0` and has no entry for `@creit.tech/stellar-wallets-kit`. A working
`node_modules` in this tree was assembled out of band and is **not
reproducible**.

To unblock:

```bash
cd ../bound/packages/sdk && npm publish   # prepack guarantees dist ships
cd ../../../bound-web && npm install      # regenerates the lock
```

## Development

```bash
npm run dev      # note: port 3000 may be occupied; use PORT=3100 npm run dev
npm run build
npm run lint
```

## The application

| Route                | What it does                                                                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `/app`               | Marketplace. Lists live certificates read from Stellar testnet, with search, status filter and a hide-expired toggle. Revalidates every 30s. |
| `/app/cert/[certId]` | One certificate: bound, reserve, auditor stake, status, expiry, and what the certificate does and does not guarantee. Challenge control.     |
| `/app/new`           | Publish a certificate through a connected wallet.                                                                                            |

### How writes work

No secret key ever reaches this app. The server builds an **unsigned,
already-simulated** transaction envelope, the browser wallet signs it in the
extension, and the server submits the signed envelope. The connected wallet is
both the transaction source and the `require_auth` address, so one envelope
signature satisfies Soroban — no separate auth-entry signing.

`lib/bound.ts` is the only module that knows where certificate data comes from,
and `lib/tx.ts` is the only door to the write path. Both are server-only.

Certificates are listed **by certificate id, never by agent address**: the
registry's `publish` authenticates only the operator and then overwrites the
agent-to-certificate mapping unconditionally, so that mapping cannot be trusted.

### What the deployed contracts cannot do yet

Publishing a certificate records a **claimed** reserve. It moves no money, and on
the currently deployed contracts an arbitrary operator **cannot fund a reserve at
all** — `ReserveVault.deposit` authenticates against a single operator address
fixed at initialization. A certificate published through `/app/new` is therefore
`Pending`, unfunded and unattested, and the page says so.

The same singleton defect means the on-chain reserve check compares one pooled
balance against a single certificate's claim, so an unrelated deposit can defeat
a genuine fraud proof. Both are fixed by per-certificate reserve accounting in the
next contract revision. See the protocol repo's `docs/DESIGN-V2.md` § 9 and its
trust-model documentation.

## Stack

Next.js 16 (App Router), React 19, Tailwind v4, shadcn, Outfit, primary `#FF5400`.
