# HANDOFF

Branch `feat/mvp-e2e`, ten commits off `main`. Every milestone in `SPEC.md` is
implemented and every acceptance command exits 0. Nothing was deployed, no
Vercel setting was written, no PR was opened, and `main` was not touched.

The headline: **certificate #14 on Stellar testnet reads `Verified · valid=true`**,
published, funded and attested end to end through the app's own HTTP routes by a
pair of keypairs that did not exist an hour earlier.

---

## 1. Status per milestone

All commands were re-run from a clean state against a fresh `pnpm dev` at
`http://localhost:3000` after the last commit. Output is verbatim, ANSI stripped.

### M0 — `chore: put the toolchain on one lockfile and add vitest` — **done, exit 0**

```
Lockfile is up to date, resolution step is skipped
Already up to date


> bound-web@0.1.0 prepare /Users/dogu/bound-web
> husky

╭ Warning ─────────────────────────────────────────────────────────────────────╮
│                                                                              │
│   Ignored build scripts: @reown/appkit@1.8.21,                               │
│   @stellar/stellar-sdk@14.2.0, blake-hash@2.0.0, bufferutil@4.1.0,           │
│   esbuild@0.28.2, protobufjs@7.4.0, protobufjs@7.5.5, secp256k1@5.0.1,       │
│   tiny-secp256k1@1.1.7, unrs-resolver@1.12.2, usb@2.18.0,                    │
│   utf-8-validate@6.0.6.                                                      │
│   Run "pnpm approve-builds" to pick which dependencies should be allowed     │
│   to run scripts.                                                            │
│                                                                              │
╰──────────────────────────────────────────────────────────────────────────────╯
Done in 1.2s using pnpm v10.27.0
stellar-sdk 16.2.0

> bound-web@0.1.0 lint /Users/dogu/bound-web
> eslint


> bound-web@0.1.0 test /Users/dogu/bound-web
> vitest run


 RUN  v4.1.11 /Users/dogu/bound-web


 Test Files  4 passed (4)
      Tests  88 passed (88)
   Start at  05:14:15
   Duration  142ms (transform 120ms, setup 0ms, import 166ms, tests 25ms, environment 0ms)

M0 exit: 0
```

### M1 — `feat: read what the chain actually holds for a certificate` — **done, exit 0**

```

> bound-web@0.1.0 test /Users/dogu/bound-web
> vitest run -- cert-state


 RUN  v4.1.11 /Users/dogu/bound-web


 Test Files  4 passed (4)
      Tests  88 passed (88)
   Start at  05:14:24
   Duration  134ms (transform 124ms, setup 0ms, import 160ms, tests 25ms, environment 0ms)


Live reads against https://soroban-testnet.stellar.org at 1787364866
  ✓ cert #1 status = Verified
  ✓ cert #1 valid = true
  ✓ cert #1 vault holds more than nothing vault=100000000000
  ✓ cert #1 lifecycle = verified
  ✓ cert #1 reserve is fully funded shortfall=0
  ✓ cert #2 status = Pending
  ✓ cert #2 vault balance = 0
  ✓ cert #2 claims a reserve it does not hold claimed=10000000000 vault=0
  ✓ cert #2 shortfall equals the whole claim = 10000000000
  ✓ cert #2 lifecycle = pending-unfunded
  ✓ cert #2 next step = fund
  ✓ cert #3 is past its expiry expires_at=2026-08-21T21:49:56.000Z
  ✓ cert #3 recorded status = Verified
  ✓ cert #3 has no open claim window = false
  ✓ cert #3 lifecycle = expired
  ✓ cert #3 valid = false
  ✓ cert #5 is past its expiry expires_at=2026-08-21T21:54:16.000Z
  · cert #5 has an open claim window on testnet — the spec expected a plain expiry here
  ✓ cert #5 lifecycle (freeze outranks expiry) = frozen
  ✓ cert #5 reports when its window closes claim_freeze=1787604935
  ✓ cert #1 live allocation is readable snapshot=15000000000 live=15000000000
  ✓ cert #1 allocation is not slashed = false
  ✓ cert #999999 reads as nothing = null
  ✓ cert #999999 is not a known id = false
  ✓ cert #1 is a known id = true
  ✓ listCertificatePage(1).total = Registry.get_cert_count() = 11
  ✓ page size = 10
  ✓ page count = 2
  ✓ page 1 holds no more than a page items=10 of 11
  ✓ page 1 is newest first 11,10,9,8,7,6,5,4,3,2
  ✓ a page past the end clamps rather than erroring = 2

30/30 checks passed
M1 exit: 0
```

### M2 — `feat: tell a wallet what it may do before it signs` — **done, exit 0**

```

> bound-web@0.1.0 test /Users/dogu/bound-web
> vitest run -- preconditions


 RUN  v4.1.11 /Users/dogu/bound-web


 Test Files  4 passed (4)
      Tests  88 passed (88)
   Start at  05:14:45
   Duration  136ms (transform 125ms, setup 0ms, import 160ms, tests 27ms, environment 0ms)


Gates against http://localhost:3000
  ✓ demo auditor is recognised as such = true
  ✓ demo auditor is registered = true
  ✓ attest on cert #2 (vault empty) = reserve-unfunded
  ✓ the refusal names both figures The vault holds $0 against a claimed reserve of $1,000. An auditor cannot attest a certificate whose reserve is not funded.
  ✓ a fresh keypair has no account = false
  ✓ its XLM balance is unknown, not zero = null
  ✓ its USDC balance is unknown, not zero = null
  ✓ stake = no-account
  ✓ publish = no-account
  ✓ faucet is still open to it — that is what the faucet is for = ok
  ✓ fund on cert #1 = already-funded
  ✓ fund on cert #2 as its operator = ok
  ✓ fund on cert #2 as a stranger = not-operator
  ✓ GET /api/wallet/not-an-address = 400
  ✓ the wallet endpoint is never cached cache-control: no-store
  ✓ POST /api/tx/build attest cert #2 = 400
  ✓ no envelope was returned = undefined
  ✓ the failure carries the same code as the gate = reserve-unfunded
  ✓ the raw chain error is kept alongside the sentence HostError: Error(WasmVm, InvalidAction)

Event log (newest f
  ✓ POST /api/tx/build stake = 200
  ✓ an envelope came back 1480 chars

Gate coverage (vitest)
  ✓ lib/preconditions.test.ts (incl. the GateCode coverage case) = 0
  · checked against http://localhost:3000

22/22 checks passed
M2 exit: 0
```

### M3 — `feat: get a fresh wallet from nothing to spendable USDC` — **done, exit 0**

```

> bound-web@0.1.0 test /Users/dogu/bound-web
> vitest run


 RUN  v4.1.11 /Users/dogu/bound-web


 Test Files  4 passed (4)
      Tests  88 passed (88)
   Start at  05:15:09
   Duration  136ms (transform 124ms, setup 0ms, import 164ms, tests 25ms, environment 0ms)


End-to-end against http://localhost:3000 (through: usdc)

1. From nothing to spendable USDC
  ✓ operator G…N6A: faucet created the account = account
  ✓ operator: the account exists on Horizon GDKD35UOIBJXBSIUFNKXUAM33GEHQJC2WNOPYDDXJTAMYKETHH6LCN6A
  ✓ operator: trustline open (USDC / G…HGF) 6403991807f57b49fc3630d75e0372a69fd0d325cf3bc9f0964066073ecc87ce
  ✓ operator: faucet transferred USDC = usdc
  ✓ operator: holds USDC on Horizon after the grant $10,000
  ✓ operator: a second grant inside the cooldown = 429
  ✓ operator: …with a cooldown code = cooldown
  · stopping after "usdc" — operator was GDKD35UOIBJXBSIUFNKXUAM33GEHQJC2WNOPYDDXJTAMYKETHH6LCN6A

7/7 checks passed
M3 exit: 0
```

### M4 — `feat: fund a certificate's reserve` — **done, exit 0**

```

> bound-web@0.1.0 test /Users/dogu/bound-web
> vitest run


 RUN  v4.1.11 /Users/dogu/bound-web


 Test Files  4 passed (4)
      Tests  88 passed (88)
   Start at  05:15:26
   Duration  148ms (transform 119ms, setup 0ms, import 160ms, tests 26ms, environment 0ms)


End-to-end against http://localhost:3000 (through: fund)

1. From nothing to spendable USDC
  ✓ operator G…K5I: faucet created the account = account
  ✓ operator: the account exists on Horizon GACBWUARPMELZX4PBNRF552JZ7LMM5NK2DUMM62XJF5U2QGK6OY27K5I
  ✓ operator: trustline open (USDC / G…HGF) 27f6477518afe6905fba38c52f6b334cfe755379d9f80d1d460767c44fb26850
  ✓ operator: faucet transferred USDC = usdc
  ✓ operator: holds USDC on Horizon after the grant $10,000
  ✓ operator: a second grant inside the cooldown = 429
  ✓ operator: …with a cooldown code = cooldown

2. Publish, then fund the reserve
  ✓ published a certificate #12 · b21e5a367ddb6e50eee62a54914012121b685f3f74e0ac18bb49b490aeebf01f
  ✓ cert #12 status = Pending
  ✓ cert #12 vault balance = 0
  ✓ cert #12 claimed reserve = 10000000000
  ✓ cert #12 lifecycle = pending-unfunded
  ✓ cert #12 operator = GACBWUARPMELZX4PBNRF552JZ7LMM5NK2DUMM62XJF5U2QGK6OY27K5I
  ✓ wrong wallet: fund refused = 400
  ✓ wrong wallet: with not-operator = not-operator
  ✓ wrong wallet: no envelope to sign = undefined
  ✓ reserve funded 619deb7ee1b8aab000a9c7f31eff5c2c41446af7fa06fd09895d352d0be3f026
  ✓ cert #12 vault now holds the claim = 10000000000
  ✓ cert #12 lifecycle = pending-funded
  ✓ cert #12 shortfall = 0
  ✓ cert #12 next step = attest
  · stopping after "fund" — certificate #12

21/21 checks passed
M4 exit: 0
```

### M5 — `feat: stake as an auditor and attest a funded certificate` — **done, exit 0**

```

> bound-web@0.1.0 test /Users/dogu/bound-web
> vitest run


 RUN  v4.1.11 /Users/dogu/bound-web


 Test Files  4 passed (4)
      Tests  88 passed (88)
   Start at  05:16:04
   Duration  135ms (transform 130ms, setup 0ms, import 165ms, tests 26ms, environment 0ms)


End-to-end against http://localhost:3000 (through: verified)

1. From nothing to spendable USDC
  ✓ operator G…HSX: faucet created the account = account
  ✓ operator: the account exists on Horizon GDJUNP7FWHSCRXGEJEPX6CSCY73Q6UPL6H6OTJUDXQ6OAEZ6PJWOSHSX
  ✓ operator: trustline open (USDC / G…HGF) a2c78dbd5c65daed6d51a3a7ea646a69ff41675344df7554a8ab66334cd14ad8
  ✓ operator: faucet transferred USDC = usdc
  ✓ operator: holds USDC on Horizon after the grant $10,000
  ✓ operator: a second grant inside the cooldown = 429
  ✓ operator: …with a cooldown code = cooldown

2. Publish, then fund the reserve
  ✓ published a certificate #13 · b7f6c07f0c1ff8c62ab189939152f084dd1c72eb8be50cc1b80a2f7911b96b12
  ✓ cert #13 status = Pending
  ✓ cert #13 vault balance = 0
  ✓ cert #13 claimed reserve = 10000000000
  ✓ cert #13 lifecycle = pending-unfunded
  ✓ cert #13 operator = GDJUNP7FWHSCRXGEJEPX6CSCY73Q6UPL6H6OTJUDXQ6OAEZ6PJWOSHSX
  ✓ wrong wallet: fund refused = 400
  ✓ wrong wallet: with not-operator = not-operator
  ✓ wrong wallet: no envelope to sign = undefined
  ✓ reserve funded bdd47a445c4c199f8c0d5244cd603e5366c7ae93a10a9535518f49ebff612599
  ✓ cert #13 vault now holds the claim = 10000000000
  ✓ cert #13 lifecycle = pending-funded
  ✓ cert #13 shortfall = 0
  ✓ cert #13 next step = attest

3. Stake, then attest
  ✓ auditor G…CWN: faucet created the account = account
  ✓ auditor: the account exists on Horizon GA5DQEMS6LMT4J2UUI4KHAHPQ4IZVAZ3P2HWYRHUUN7Y2S7QVQD7VCWN
  ✓ auditor: trustline open (USDC / G…HGF) 5e316cd87b4496719add14bfb61e8cbabbf0fa75fc71223d69faa1a0b40cd16b
  ✓ auditor: faucet transferred USDC = usdc
  ✓ auditor: holds USDC on Horizon after the grant $10,000
  ✓ auditor: a second grant inside the cooldown = 429
  ✓ auditor: …with a cooldown code = cooldown
  ✓ auditor staked f017b8099a0899076215429ccb5c9c9bbbd4a9743a744cd64289a95eff5d9c60
  ✓ auditor is registered = true
  ✓ auditor's free stake = 20000000000
  ✓ attest cert #2 refused = 400
  ✓ attest cert #2 code = reserve-unfunded
  ✓ attest cert #2: no envelope to sign = undefined
  ✓ attested f7d35ca18848982d97c9abaeae39e54453e4d1fd79e83f329c0333ec1fc0e00e
  ✓ cert #13 status = Verified
  ✓ cert #13 valid = true
  ✓ cert #13 lifecycle = verified
  ✓ cert #13 auditor = GA5DQEMS6LMT4J2UUI4KHAHPQ4IZVAZ3P2HWYRHUUN7Y2S7QVQD7VCWN
  ✓ cert #13 live allocation = 10000000000
  ✓ cert #13 allocation snapshot = 10000000000
  ✓ cert #13 allocation not slashed = false
  ✓ cert #13 is not the demo auditor's = false

4. The rendered page
  ✓ GET /app/cert/13 = 200
  ✓ the page renders Verified 80324 bytes
  ✓ the page names the certificate #13
  ✓ the page does not claim our own auditor attested it attested by a fresh, unrelated wallet

5. The demo-auditor disclosure
  ✓ GET /app/cert/1 = 200
  ✓ cert #1 names the demo auditor's address GCNDTXR7FDINZ7THO2QMAE7QXBTM2P5JW7XDNN3V6BJM3UFK67GLSMEF
  ✓ cert #1 discloses that the auditor is boundprotocol.dev's own DemoAuditorNote rendered
  ✓ …and that it is not an independent third party disclosure text present
  · operator GDJUNP7FWHSCRXGEJEPX6CSCY73Q6UPL6H6OTJUDXQ6OAEZ6PJWOSHSX
  · auditor  GA5DQEMS6LMT4J2UUI4KHAHPQ4IZVAZ3P2HWYRHUUN7Y2S7QVQD7VCWN
  · certificate #13

51/51 checks passed
M5 exit: 0
```

### M6 — `feat: survive reloads, pagination, and the states nobody wants to see` — **done, exit 0**

```

> bound-web@0.1.0 lint /Users/dogu/bound-web
> eslint


> bound-web@0.1.0 test /Users/dogu/bound-web
> vitest run -- tx-journal


 RUN  v4.1.11 /Users/dogu/bound-web


 Test Files  4 passed (4)
      Tests  88 passed (88)
   Start at  05:17:20
   Duration  191ms (transform 138ms, setup 0ms, import 175ms, tests 25ms, environment 0ms)


> bound-web@0.1.0 build /Users/dogu/bound-web
> next build

▲ Next.js 16.3.1 (Turbopack)
- Environments: .env.local
✓ Running next.config.ts took 11ms

  Creating an optimized production build ...
✓ Compiled successfully in 756ms
  Running TypeScript ...
  Finished TypeScript in 1288ms ...
  Collecting page data using 11 workers ...
  Generating static pages using 11 workers (0/15) ...
  Generating static pages using 11 workers (3/15)
  Generating static pages using 11 workers (7/15)
(node:49641) [DEP0005] DeprecationWarning: Buffer() is deprecated due to security and usability issues. Please use the Buffer.alloc(), Buffer.allocUnsafe(), or Buffer.from() methods instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
  Generating static pages using 11 workers (11/15)
✓ Generating static pages using 11 workers (15/15) in 3.3s
  Finalizing page optimization ...

Route (app)                       Revalidate  Expire
┌ ○ /
├ ○ /_not-found
├ ƒ /api/attest
├ ƒ /api/challenge/[challengeId]
├ ƒ /api/faucet
├ ƒ /api/tx/[hash]
├ ƒ /api/tx/build
├ ƒ /api/tx/submit
├ ƒ /api/wallet/[address]
├ ƒ /app
├ ○ /app/auditor                         30s      1y
├ ƒ /app/cert/[certId]
├ ○ /app/new
├ ○ /blog
├ ○ /contact
├ ○ /icon.png
├ ○ /opengraph-image
├ ○ /robots.txt
└ ○ /sitemap.xml


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand


States against http://localhost:3000
  · registry holds 13 certificates, 10 to a page (2 pages)
  ✓ GET /app?page=1 = 200
  ✓ GET /app?page=2 = 200
  ✓ the two pages share no certificate page 1: [13,12,11,10,9,8,7,6,5,4] · page 2: [3,2,1]
  ✓ page 1 is full 10 of 10
  ✓ page 2 carries the certificates page 1 could not newest on page 2 is #3, oldest on page 1 is #4
  ✓ a page past the end still renders = 200
  ✓ a page number that is not one renders page 1 = 200

Transaction lookup
  ✓ GET /api/tx/b1b382f6… = 200
  ✓ a landed transaction reads as SUCCESS = SUCCESS
  ✓ an unknown hash is a 200, not an error = 200
  ✓ …and reads as NOT_FOUND rather than as a failure = NOT_FOUND
  ✓ a malformed hash is a 400 = 400

Unwanted states
  ✓ GET /app/cert/999999 = 404
  ✓ cert #2's vault still holds nothing = $0
  ✓ GET /app/cert/2 = 200
  ✓ the page prints the claimed figure ($1,000) $1,000
  ✓ the page prints the live $0 the vault actually holds $0
  ✓ the page no longer calls the claim pre-funded the old unqualified caption is gone
  ✓ the page names the shortfall shortfall stated

Journal (vitest)
  ✓ lib/tx-journal.test.ts = 0

20/20 checks passed
M6 exit: 0
```

---

## 2. The full end-to-end run

`pnpm exec tsx scripts/e2e.ts`, against a local dev server and live testnet.
Verbatim, ANSI stripped.

```

End-to-end against http://localhost:3000 (through: verified)

1. From nothing to spendable USDC
  ✓ operator G…GMN: faucet created the account = account
  ✓ operator: the account exists on Horizon GD4RXFLHHU2TQ64QWXFLQ27ML544DUO2F2IC5BZJ26KVKM5WOMHV2GMN
  ✓ operator: trustline open (USDC / G…HGF) c011913e335c2a44974ebe926d20e1447998f82c7a89fe130ea61ce0cb20bb53
  ✓ operator: faucet transferred USDC = usdc
  ✓ operator: holds USDC on Horizon after the grant $10,000
  ✓ operator: a second grant inside the cooldown = 429
  ✓ operator: …with a cooldown code = cooldown

2. Publish, then fund the reserve
  ✓ published a certificate #14 · ad613daaf6eb17626131652d5e9a70c11a0765fbd6ccc28152685ee033771b54
  ✓ cert #14 status = Pending
  ✓ cert #14 vault balance = 0
  ✓ cert #14 claimed reserve = 10000000000
  ✓ cert #14 lifecycle = pending-unfunded
  ✓ cert #14 operator = GD4RXFLHHU2TQ64QWXFLQ27ML544DUO2F2IC5BZJ26KVKM5WOMHV2GMN
  ✓ wrong wallet: fund refused = 400
  ✓ wrong wallet: with not-operator = not-operator
  ✓ wrong wallet: no envelope to sign = undefined
  ✓ reserve funded ea8fa8791789ec15d40130bdd83e6c246c77e9e818f0cfe9c922a3ee41a85b84
  ✓ cert #14 vault now holds the claim = 10000000000
  ✓ cert #14 lifecycle = pending-funded
  ✓ cert #14 shortfall = 0
  ✓ cert #14 next step = attest

3. Stake, then attest
  ✓ auditor G…MCA: faucet created the account = account
  ✓ auditor: the account exists on Horizon GDXM5FO7YHRNOJP2MVIN27RPEZY5CHVJYNJB6P33BIATXGNMTRLIKMCA
  ✓ auditor: trustline open (USDC / G…HGF) fa2399e51ee6bb658bbe607b6650b69220cdc6cbfd453b0fb6aca80d82b29c66
  ✓ auditor: faucet transferred USDC = usdc
  ✓ auditor: holds USDC on Horizon after the grant $10,000
  ✓ auditor: a second grant inside the cooldown = 429
  ✓ auditor: …with a cooldown code = cooldown
  ✓ auditor staked 923ab973732fa1e275051cbd6b4d93f4c06510ba81c2f0afb11badd7d91b7b1a
  ✓ auditor is registered = true
  ✓ auditor's free stake = 20000000000
  ✓ attest cert #2 refused = 400
  ✓ attest cert #2 code = reserve-unfunded
  ✓ attest cert #2: no envelope to sign = undefined
  ✓ attested b53ff787f29f7ce64d70d92e90bce850bcbb32cee21e5ea7d19f03869109bf0e
  ✓ cert #14 status = Verified
  ✓ cert #14 valid = true
  ✓ cert #14 lifecycle = verified
  ✓ cert #14 auditor = GDXM5FO7YHRNOJP2MVIN27RPEZY5CHVJYNJB6P33BIATXGNMTRLIKMCA
  ✓ cert #14 live allocation = 10000000000
  ✓ cert #14 allocation snapshot = 10000000000
  ✓ cert #14 allocation not slashed = false
  ✓ cert #14 is not the demo auditor's = false

4. The rendered page
  ✓ GET /app/cert/14 = 200
  ✓ the page renders Verified 80324 bytes
  ✓ the page names the certificate #14
  ✓ the page does not claim our own auditor attested it attested by a fresh, unrelated wallet

5. The demo-auditor disclosure
  ✓ GET /app/cert/1 = 200
  ✓ cert #1 names the demo auditor's address GCNDTXR7FDINZ7THO2QMAE7QXBTM2P5JW7XDNN3V6BJM3UFK67GLSMEF
  ✓ cert #1 discloses that the auditor is boundprotocol.dev's own DemoAuditorNote rendered
  ✓ …and that it is not an independent third party disclosure text present
  · operator GD4RXFLHHU2TQ64QWXFLQ27ML544DUO2F2IC5BZJ26KVKM5WOMHV2GMN
  · auditor  GDXM5FO7YHRNOJP2MVIN27RPEZY5CHVJYNJB6P33BIATXGNMTRLIKMCA
  · certificate #14

51/51 checks passed
exit: 0
```

**Exit code 0. 51 of 51 checks passed.**

Every assertion after a write is a live chain read, not the transaction's own
return value — `getCertificateFacts` goes back to the registry, the reserve
vault and the staking contract after the fact. The last two sections fetch the
rendered HTML, because a green build has never said anything about whether the
page tells the truth.

---

## 3. Waiting for you

### The two environment variables

**I did not paste the secret values into this file.** The brief said to include
them and also said never to commit a secret; this file is committed and pushed
to a remote, so the values stay out of it. They are in `.env.local` on this
machine, which is gitignored and which `git add` refuses.

Run these from the repo root — `vercel env add` reads the value from stdin:

```bash
grep '^FAUCET_SECRET=' .env.local | cut -d= -f2- | vercel env add FAUCET_SECRET production
grep '^AUDITOR_SECRET=' .env.local | cut -d= -f2- | vercel env add AUDITOR_SECRET production
```

Or, to read them and paste by hand:

```bash
grep -E '^(FAUCET_SECRET|AUDITOR_SECRET)=' .env.local
```

`pnpm setup:demo` also prints both, with the same two commands.

The public sides, for checking you added the right thing:

| Variable         | Public key                                                 | Currently holds                                                             |
| ---------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------- |
| `FAUCET_SECRET`  | `GBZ2IWD2PPH4WMCRWFPPHS7WFQ4FDPUEKMFQXEHRZT6ZNDBJUGYUB5OQ` | 820,000 test USDC (started at 1,000,000; the e2e runs below spent the rest) |
| `AUDITOR_SECRET` | `GCNDTXR7FDINZ7THO2QMAE7QXBTM2P5JW7XDNN3V6BJM3UFK67GLSMEF` | $6,500 staked, $2,500 free after attesting cert #7                          |

**Do not add `OPERATOR_SECRET` to Vercel.** It is the USDC issuer and the
operator of every seeded certificate. `scripts/setup-demo.ts` is the only thing
in this repo that reads it, it runs locally, and no route handler touches it.

### The deploy

```bash
vercel --prod
```

I did not run it, and I did not run `vercel env add`.

### ⚠️ Watch this deploy — the build environment changed

M0 deleted `package-lock.json`. Vercel auto-detects the package manager from the
lockfile, so **the next deploy will install with pnpm instead of npm** for the
first time. That is the intended fix — the npm lock resolved
`@stellar/stellar-sdk` to 13.3.0 while `@bound/sdk` needs `^16.0.1`, so the two
lockfiles built different trees and only one of them could produce the envelopes
this app signs. But it means the first deploy after this branch is a change of
build environment as well as a change of code. Watch it rather than assuming it
is routine.

`packageManager: "pnpm@10.27.0"` is pinned in `package.json`, which is what
Vercel keys off.

### After deploying

`pnpm exec tsx scripts/e2e.ts --base-url=https://www.boundprotocol.dev` runs the
whole walk against the deployment. It costs one certificate, two throwaway
accounts and ~$20,000 of faucet USDC. It will fail at the faucet step until both
env vars are set and the deployment has been rebuilt with them.

---

## 4. Departures from `SPEC.md`

Everything below is additive or a correction; nothing in the spec's scope was
dropped.

1. **`GateContext.nowUnix?: number`** (§4.3). `past-deadline` is a comparison
   against a clock, and a table that reads `Date.now()` inside itself cannot be
   tested. Optional, defaults to the real clock.
2. **`TxJournal.entries()`** (§4.6). The banner has to show what _resolved_ as
   well as what is in flight, and `pending()` by definition cannot return it.
3. **`GET /api/wallet/:address` also returns `cert`** (§4.4). It already reads
   the certificate to compute the gates; handing that read back rather than
   throwing it away is what lets the publish success card show the live vault
   balance beside the claim without a second round trip.
4. **`isKnownCertId(certId)` added to `lib/bound.ts`.** §4.1 keeps
   `getCertificateFacts → CertFacts | null`, which cannot distinguish "never
   issued" from "issued, then archived". The certificate _count_ is a separate
   ledger entry that survives either way, so an id inside it that will not read
   is a certificate that did exist. That is what drives the archived notice
   instead of a 404. The alternative — synthesising a `CertListItem` for a
   record nothing could read — would have been exactly the invention this
   codebase refuses.
5. **`lib/clock.ts`.** `Date.now()` in a component body trips
   `react-hooks/purity`, even in a Server Component that renders once. One named
   seam rather than an eslint-disable.
6. **`lib/wallet/use-wallet-facts.ts` and `lib/wallet/use-fund-reserve.ts`.**
   Not named in §4.7; the first is the client half of §4.4, the second exists so
   the certificate page's fund button and the publish card's fund button are
   literally the same mutation. Two copies would drift, and the copy that
   drifted would be the one telling somebody their reserve was funded.
7. **`/api/tx/build` re-simulates the assembled envelope** before returning it —
   see §5 below for why this had to be added.
8. **The gate exempts the USDC issuer** from the trustline and balance checks.
   Also §5.
9. **`CERT_PAGE_SIZE = 10`.** The spec did not pick one.
10. **`.gitignore` gained `!.env.example`.** §4.8 asks for the keys to be
    documented in `.env.example`, and `.env*` made that file untrackable. Only
    the template is un-ignored; `git add .env.local` is still refused, verified.
11. **`README.md` rewritten.** It described a v1 world in which "an arbitrary
    operator **cannot fund a reserve at all**" and in which `npm install` fails.
    Both untrue as of this branch. Leaving it would have been a page that lies,
    which is the thing this project cares most about.
12. **e2e's "wrong wallet" is `accounts.challenger`**, a funded testnet account,
    not a fresh keypair. A fresh keypair fails earlier on "Account not found"
    and proves nothing about the vault's operator check.
13. **`check-reads.ts` asserts cert #5 → `frozen`, not `expired`.** The spec was
    wrong about testnet state; see §5.
14. **No CI file.** There is no `.github/` in this repo. The brief said that if I
    touched CI at all it should run only `typecheck + lint + test + build`; I
    read creating one from nothing as out of scope and left it alone.
15. **`deposit-fee` and `pay` stay in the allowlist with no UI**, per the
    resolved open question. They map to no `ActionKey`, so their failures fall
    through to raw — which is the honest end state for an action nothing here
    claims to understand.

## 5. What the spec got wrong

The spec was written from static reading plus live probes. Six things
implementation turned up.

### 5.1 Cert #5 is frozen, not merely expired — and so is #4

`SPEC.md` §5 M1 names cert #5 as the "expired" fixture. It is not. A challenge
has been filed against #4 and #5 on testnet and `Registry::is_frozen` returns
true for both, with claim windows closing 2026-08-24. §4.2 fixes freeze _above_
expiry in the precedence order, so #5 derives to `frozen`.

`check-reads.ts` asserts both facts — #5 is past its expiry **and** it derives to
`frozen` — and uses cert **#3** as the clean expiry fixture the spec wanted. The
deviation is documented at the top of that file, and the script prints a note
when it sees the open window.

### 5.2 `buildActionXdr` does not validate — the build route's own comment was wrong

This is the significant one. `app/api/tx/build/route.ts` carried this claim:

> The build simulates against the chain, so a request that could never succeed
> (unregistered auditor, missing trustline, …) fails _here_, with the contract's
> own message, rather than after the user has signed.

It did not. `@bound/sdk`'s `buildActionXdr` returns `AssembledTransaction.toXDR()`,
and `toXDR()` serialises whatever was assembled — **including an assembly whose
simulation failed**. `SimulationFailedError` is only raised on `.result`, which
`buildActionXdr` never touches.

Verified against the deployed v2 contracts. All four of these returned a
perfectly well-formed envelope from the old route:

- attest cert #2, whose vault holds nothing
- attest cert #1, which already has an auditor
- attest as an unregistered auditor
- deposit into a certificate owned by somebody else

Signing any of them costs a fee and fails on-chain. `assertSignableXdr` in
`lib/tx.ts` now re-simulates the assembled envelope and refuses it. That is one
extra RPC round trip per build, bought deliberately.

The re-simulation also catches the auth case: an assembled envelope carries its
auth entries, so a stranger's deposit comes back `Error(Auth, InvalidAction)`.
The envelope's own auth entries are inspected first, which gives the precise
message ("needs the signature of GDOUNK…") without any network call at all.

### 5.3 The operator is the USDC issuer, and an issuer looks broke on Horizon

`accounts.operator` issues the testnet USDC. Its Horizon record carries **only
XLM** — issuers hold no trustline to their own asset — while the SAC reports its
balance as `i128::MAX`. A gate that reads Horizon and refuses on "no trustline /
no USDC" therefore refuses the one account that can always send USDC.

`gate()` exempts `USDC_ISSUER` explicitly, with the reasoning in a comment and a
vitest case. `check-gates.ts` asserts `fund` on cert #2 as its operator is `ok`.

### 5.4 The contracts panic rather than returning typed errors

Every `attest` failure surfaces as `HostError: Error(WasmVm, InvalidAction)` with
`"VM call trapped: UnreachableCodeReached"`. There is no error code to read, so
`translateContractError` **cannot** distinguish reserve-unfunded from
already-attested from not-registered from insufficient-free-stake.

What it does instead: read the diagnostic event log's own sub-call returns
(`is_registered → false`, `get_balance → 0`) for the two cases where that is a
direct contract read rather than a guess, and return `null` for everything else
so the UI shows the raw string labelled as raw. This is why the gate table
matters so much — the gate, not the translation, is what tells someone _why_.

### 5.5 The settlement deadline is a week past expiry, not 72 hours

`claim_window_seconds()` is 259,200 (72h), which is what §2 describes and is
correct for how long an open window stays open. But
`get_cert_settlement_deadline` − `expires_at` is **604,800** (7 days) on every
seeded certificate. Those are two different windows. The `past-deadline` gate
uses the settlement deadline, and the certificate page shows it as its own row.

### 5.6 `pnpm test -- cert-state` does not filter

pnpm passes `-- cert-state` through verbatim and vitest's CLI parser puts the
token in `argv['--']` rather than treating it as a filename filter, so the whole
suite runs. Left exactly as the spec wrote it: running everything is a superset
of running the named file, so the command still means something. Worth knowing
before someone relies on the filter.

## 6. Judgement calls you might want to reverse

1. **I published three extra certificates on testnet to make a page-2 assertion
   real.** M6 requires `/app?page=1` and `/app?page=2` to hold disjoint ids
   "when total > pageSize". With 8 certificates and a page size of 10 that
   branch could not run — `check-states.ts` _failed_ it rather than skipping it
   quietly, and to make it pass I ran the full e2e three more times, taking the
   registry to 11. The alternative was shrinking `CERT_PAGE_SIZE` to fit the
   registry, which is tuning the product to make a test pass. Cost: 3
   certificates, 6 throwaway accounts, ~$60,000 faucet USDC. The verification
   pass in §1 and §2 then added three more; the registry now holds 14, on two
   pages, and the faucet has spent $180,000 of its $1,000,000 across the whole
   night.
2. **An unreadable vault gates as `pending-unfunded`.** The `Lifecycle` union has
   no "unknown", so a vault that does not answer falls to the state that grants
   the least — it must not unlock "attest". The _reading_ stays unknown:
   `reserveShortfallStroops` and `reserveFundedRatio` are both `null`, and the UI
   keys its figures off those, so it prints "Unreadable", never "$0". If you
   would rather the lifecycle itself carry the uncertainty, that is a change to
   the union in §4.2.
3. **Attest gate order:** archived → frozen → invalid → expired →
   already-attested → reserve-unfunded → self-attest → not-registered →
   insufficient-free-stake. Chosen to match roughly the order the contract fails
   in, so the gate and the chain rarely disagree about _which_ thing is wrong.
   `check-gates.ts` pins the case the spec named (`reserve-unfunded` for the demo
   auditor on cert #2).
4. **Faucet: $10,000 a grant, one hour per address, in-memory.** As assumed in
   §7.3. The empty-faucet check (resolved open question 3) is both a `GET
/api/faucet` the UI reads before offering the button _and_ a balance read
   inside `POST` before any transfer starts.
5. **`setup-demo.ts` appends `FAUCET_SECRET` to `.env.local`** when it generates
   one, so the local faucet route works immediately. It never overwrites an
   existing one.
6. **The demo-auditor button only appears when the connected wallet cannot
   attest.** Someone who has staked properly is never offered the shortcut. The
   disclosure (`DemoAuditorNote`) appears in three places: beside the button, on
   the certificate's auditor row as a compact chip, and as a full panel on any
   certificate that address has attested — including seeded #1, #3, #4, #5.
7. **The journal keeps entries for 24 hours and at most 50.** A week-old hash
   helps nobody, and an unbounded list in `localStorage` is a quota error waiting
   to happen. Both are one constant each in `lib/tx-journal.ts`.
8. **A submit failure is never recorded as `failed`.** `/api/tx/submit` throws on
   its own 30-second timeout as well as on a real rejection and cannot tell them
   apart, so the entry stays `pending` and the journal asks the chain. This is
   the specific lie §4.6 exists to fix; it does mean a genuinely rejected
   transaction shows "not resolved yet" until the next page load reconciles it.
9. **Landing CTAs point at `/app/new`, with a second link to `/app`.** Copy and
   links only, as §7.8 required. The hero now says the wallet you connect is
   given test XLM and test USDC, which is true of the deployed app only once
   `FAUCET_SECRET` is set — if you deploy without it, that sentence is a promise
   the site cannot keep. The faucet panel itself degrades honestly ("this
   deployment has no faucet key configured"), but the hero line does not know.
   **Set the env var before deploying, or soften that line.**
10. **`/app/auditor` scans only the newest page** for its "waiting for an
    auditor" queue, and says so underneath. A queue that costs a hundred RPC
    round trips to render is one nobody waits for.

## 7. Also worth knowing

- **`/app` is now dynamic.** It reads `searchParams`, so it is server-rendered on
  demand rather than prerendered with `revalidate = 30`. `/app/auditor` and
  `/app/cert/[certId]` still revalidate on the 30-second timer.
- **Defect L2 is unfixed and now visible.** `ArchivedNotice` explains the state
  on a certificate whose registry record will not read but whose id is within
  the count, and on a readable certificate whose vault or staking read hit an
  archival error. Neither builds a `RestoreFootprint` transaction. Every
  certificate published through this app is on the same clock.
- **The `/api/attest` endpoint answers to the same gate table** the UI does, so
  it cannot be talked into signing something the button would have refused —
  verified live: `POST /api/attest {certId: 2}` returns 400 `reserve-unfunded`.
- **Certificate #7 was attested by the demo auditor** during verification, which
  is how that path was proved end to end. It reads `Verified` with the
  disclosure rendered.
