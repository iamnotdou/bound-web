import type { Metadata } from "next";
import { CodeBlock } from "@/components/near/docs/code-block";
import {
  A,
  C,
  DocArticle,
  H2,
  H3,
  Note,
  P,
  Table,
  UL,
} from "@/components/near/docs/doc";
import { docMetadata, SOURCE } from "@/lib/near/docs";
import {
  BOUND_CONTRACT,
  NEAR_DEPLOYMENT,
  TOKEN_CONTRACT,
} from "@/lib/near/deployment";

export const metadata: Metadata = docMetadata("contract");

interface Method {
  name: string;
  sig: string;
  caller: string;
  deposit: string;
  returns: string;
  does: React.ReactNode;
  errors: string[];
}

const METHODS: { group: string; id: string; items: Method[] }[] = [
  {
    group: "Storage and money",
    id: "money",
    items: [
      {
        name: "storage_deposit",
        sig: "storage_deposit(account_id?: AccountId)",
        caller: "anyone (registers account_id, default the caller)",
        deposit:
          ">= 0.01 NEAR; excess, or all of it if already registered, is refunded",
        returns: "{ total, available }",
        does: "Registers an internal balance. Deposits are not refundable in this version.",
        errors: ["StorageDepositTooSmall", "StorageNotCovered"],
      },
      {
        name: "ft_on_transfer",
        sig: "ft_on_transfer(sender_id, amount: U128, msg: String)",
        caller: "the configured token only (via ft_transfer_call)",
        deposit: "none",
        returns:
          "unused amount: all of it when the beneficiary is not registered, else 0",
        does: (
          <>
            Credits the sender, or <C>account_id</C> for a <C>credit</C> msg,
            then runs the msg action. Any parse error or failed action panics,
            so the token refunds the whole transfer.
          </>
        ),
        errors: [
          "UnknownToken",
          "InvalidAmount",
          "InvalidMsg",
          "plus the errors of the msg action",
        ],
      },
      {
        name: "withdraw",
        sig: "withdraw(amount: U128)",
        caller: "any registered account (its own balance)",
        deposit: "exactly 1 yoctoNEAR, at least 30 Tgas",
        returns: "Promise (token ft_transfer, then on_withdraw)",
        does: "Debits first, then sends the tokens. The private on_withdraw callback re-credits if the transfer fails (for example the caller is not registered on the token).",
        errors: [
          "NotEnoughGas",
          "InvalidAmount",
          "NotRegistered",
          "InsufficientBalance",
        ],
      },
    ],
  },
  {
    group: "Auditor stake",
    id: "stake",
    items: [
      {
        name: "stake",
        sig: "stake(amount: U128)",
        caller: "auditor (its own balance)",
        deposit: "1 yoctoNEAR",
        returns: "()",
        does: 'Moves internal balance to free stake. The same happens with ft_transfer_call msg {"stake":{}}.',
        errors: ["InvalidAmount", "InsufficientBalance"],
      },
      {
        name: "unstake",
        sig: "unstake(amount: U128)",
        caller: "auditor",
        deposit: "1 yoctoNEAR",
        returns: "()",
        does: "Moves free stake (never allocated stake) back to the internal balance.",
        errors: ["InvalidAmount", "InsufficientFreeStake"],
      },
    ],
  },
  {
    group: "Certificates",
    id: "certificates",
    items: [
      {
        name: "publish",
        sig: "publish(agent, bound: U128, reserve: U128, expires_at: u64, auditor, float_cap: U128, allowlist?: AccountId[], premium?: U128)",
        caller: "operator (registered)",
        deposit: ">= 0.05 NEAR; excess refunded",
        returns: "cert_id: u64",
        does: "Creates a Pending certificate. A premium is escrowed from the operator's balance and paid at attest. expires_at is unix seconds.",
        errors: [
          "PublishDepositTooSmall",
          "NotRegistered",
          "InvalidAgent",
          "InvalidAccount",
          "InvalidAuditor",
          "InvalidAmount",
          "InvalidFloatCap",
          "InvalidExpiry",
          "InvalidAllowlist",
          "InsufficientBalance",
          "StorageNotCovered",
        ],
      },
      {
        name: "accept",
        sig: "accept(cert_id: u64)",
        caller: "the certificate's agent",
        deposit: "1 yoctoNEAR",
        returns: "()",
        does: "Pending to Accepted; makes this the agent's current certificate.",
        errors: [
          "NoSuchCert",
          "NotAgent",
          "InvalidStatus",
          "CertExpired",
          "AgentHasLiveCert",
        ],
      },
      {
        name: "fund_reserve",
        sig: "fund_reserve(cert_id: u64, amount: U128)",
        caller: "operator",
        deposit: "1 yoctoNEAR",
        returns: "()",
        does: 'Moves internal balance into reserve_locked. Pending, Accepted or Verified. Also via msg {"reserve":{"cert_id":N}}.',
        errors: [
          "InvalidAmount",
          "NoSuchCert",
          "NotOperator",
          "InvalidStatus",
          "InsufficientBalance",
        ],
      },
      {
        name: "attest",
        sig: "attest(cert_id: u64, allocation: U128)",
        caller: "the named auditor",
        deposit: "1 yoctoNEAR",
        returns: "()",
        does: "Locks allocation of free stake behind the certificate, pays the escrowed premium (protocol_fee_bps to the treasury, the rest to the auditor), Accepted to Verified.",
        errors: [
          "NotAuditor",
          "NotAccepted",
          "CertExpired",
          "ReserveUnfunded",
          "AllocationBelowMinStake",
          "InsufficientFreeStake",
        ],
      },
      {
        name: "release_reserve",
        sig: "release_reserve(cert_id: u64)",
        caller: "operator",
        deposit: "1 yoctoNEAR",
        returns: "U128 released",
        does: "Before attestation: at any time, also refunding an escrowed premium. Verified or Invalid: from the settlement deadline on. Returns reserve_locked plus float and marks the certificate Released.",
        errors: ["NotOperator", "CertFrozen", "Locked", "NothingToRelease"],
      },
      {
        name: "release_allocation",
        sig: "release_allocation(cert_id: u64)",
        caller: "the certificate's auditor",
        deposit: "1 yoctoNEAR",
        returns: "U128 released",
        does: "From the settlement deadline on, with no open window: the remaining allocation goes back to free stake.",
        errors: ["NotAuditor", "CertFrozen", "Locked", "NothingToRelease"],
      },
    ],
  },
  {
    group: "Spending",
    id: "spending",
    items: [
      {
        name: "fund_float",
        sig: "fund_float(cert_id: u64, amount: U128)",
        caller: "operator",
        deposit: "1 yoctoNEAR",
        returns: "()",
        does: 'Tops up the float, never above float_cap. Accepted or Verified. Also via msg {"float":{"cert_id":N}}.',
        errors: [
          "InvalidAmount",
          "NotOperator",
          "InvalidStatus",
          "FloatCapExceeded",
          "InsufficientBalance",
        ],
      },
      {
        name: "pay",
        sig: "pay(cert_id: u64, to: AccountId, amount: U128, memo?: String)",
        caller: "the certificate's agent (pay-only function-call key)",
        deposit: "none (not payable, so a function-call key can call it)",
        returns: "()",
        does: "Moves amount from the float to to's internal balance, meters spent and pay_count, emits a pay event. See How it works for the order of checks.",
        errors: [
          "NotAgent",
          "CertNotVerified",
          "CertFrozen",
          "SettlementDeadlinePassed",
          "NotCurrentCert",
          "CertHalted",
          "InvalidAmount",
          "InvalidRecipient",
          "RecipientNotAllowed",
          "RecipientNotRegistered",
          "FloatExceeded",
          "MemoTooLong",
        ],
      },
      {
        name: "halt / resume",
        sig: "halt(cert_id: u64), resume(cert_id: u64)",
        caller: "operator",
        deposit: "1 yoctoNEAR",
        returns: "()",
        does: "Stops or restarts pay. A settled (Invalid) certificate cannot pay whatever this flag says.",
        errors: ["NoSuchCert", "NotOperator"],
      },
      {
        name: "clawback",
        sig: "clawback(cert_id: u64)",
        caller: "operator",
        deposit: "1 yoctoNEAR",
        returns: "U128 returned",
        does: "Takes the unspent float back to the operator's balance.",
        errors: ["NoSuchCert", "NotOperator"],
      },
    ],
  },
  {
    group: "Claims and settlement",
    id: "claims",
    items: [
      {
        name: "challenge",
        sig: "challenge(cert_id: u64, proof: Proof, victim?: AccountId, bond: U128)",
        caller: "anyone except the operator, agent and auditor",
        deposit: ">= 0.01 NEAR; excess refunded",
        returns: "challenge_id: u64",
        does: "Posts the bond. A false trustless predicate is rejected at once (bond to the treasury); otherwise opens or joins the claim window and freezes the certificate.",
        errors: [
          "ChallengeDepositTooSmall",
          "NoSuchCert",
          "NotChallengeable",
          "ConflictedChallenger",
          "SettlementDeadlinePassed",
          "BondTooSmall",
          "ConflictedVictim",
          "NotRegistered",
          "InsufficientBalance",
          "InvalidAmount",
          "EvidenceUriTooLong",
          "WindowFull",
          "DuplicateClaim",
          "StorageNotCovered",
        ],
      },
      {
        name: "resolve_by_arbiter",
        sig: "resolve_by_arbiter(challenge_id: u64, proven: bool, harm: U128)",
        caller: "the arbiter",
        deposit: "1 yoctoNEAR",
        returns: "()",
        does: "Decides a Harm claim. Proven: 0 < harm <= claimed, capped at coverage. Rejected: bond to the treasury and the window slot freed.",
        errors: [
          "NotArbiter",
          "NoSuchChallenge",
          "NotArbitrable",
          "AlreadyResolved",
          "NoOpenWindow",
          "InvalidHarm",
        ],
      },
      {
        name: "close_window",
        sig: "close_window(cert_id: u64)",
        caller: "anyone",
        deposit: "1 yoctoNEAR",
        returns: "Settlement | null",
        does: "Settles every claim in the window atomically: the waterfall (fraud) or the hygiene bounty. Null when nothing was admitted.",
        errors: [
          "NoSuchCert",
          "NotChallengeable",
          "NoOpenWindow",
          "WindowOpen",
          "ArbiterGrace",
        ],
      },
    ],
  },
];

const VIEWS: [string, string, string][] = [
  [
    "verify(agent)",
    "CertView | null",
    "the agent's current (last accepted) certificate",
  ],
  [
    "get_cert(cert_id)",
    "CertView | null",
    "one certificate by id; ids above u32::MAX return null",
  ],
  [
    "list_certs(from_index?, limit?)",
    "CertView[]",
    "a page of certificates; limit at most 50",
  ],
  ["cert_count()", "u64", "number of certificates"],
  ["challenge_count()", "u64", "number of challenges"],
  [
    "get_challenge(challenge_id)",
    "ChallengeView | null",
    "challenger, victim, proof, bond, filed_at, adjudicated, proven, harm, verdict",
  ],
  [
    "get_window(cert_id)",
    "WindowView | null",
    "the open window: opened_at, closes_at, claims",
  ],
  ["get_config()", "Config", "the immutable configuration"],
  [
    "get_accounts()",
    "{ owner, token, treasury, arbiter }",
    "the fixed accounts",
  ],
  ["get_owner()", "AccountId", "owner set at init"],
  ["balance_of(account_id)", "U128", "internal balance (0 if unregistered)"],
  ["get_stake(auditor)", "{ free, allocated }", "an auditor's stake"],
  [
    "storage_balance_of(account_id)",
    "{ total, available } | null",
    "registration check",
  ],
];

function MethodCard({ m }: { m: Method }) {
  return (
    <div className="bg-card ring-foreground/10 rounded-lg p-4 ring-1">
      <H3 id={`m-${m.name.split(" ")[0]}`}>
        <span className="font-address">{m.name}</span>
      </H3>
      <p className="font-address text-muted-foreground mt-1 text-xs [overflow-wrap:anywhere]">
        {m.sig}
      </p>
      <dl className="mt-3 grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[7rem_1fr]">
        <dt className="text-muted-foreground">Caller</dt>
        <dd>{m.caller}</dd>
        <dt className="text-muted-foreground">Deposit</dt>
        <dd>{m.deposit}</dd>
        <dt className="text-muted-foreground">Returns</dt>
        <dd className="font-address text-xs leading-5">{m.returns}</dd>
        <dt className="text-muted-foreground">Does</dt>
        <dd>{m.does}</dd>
        <dt className="text-muted-foreground">Errors</dt>
        <dd className="flex flex-wrap gap-1">
          {m.errors.map((e) => (
            <C key={e}>{e}</C>
          ))}
        </dd>
      </dl>
    </div>
  );
}

export default function ContractReference() {
  const cfg = NEAR_DEPLOYMENT.config;
  return (
    <DocArticle slug="contract">
      <P>
        Contract <C>{BOUND_CONTRACT}</C>, near-sdk 5.30.1, source{" "}
        <A href={SOURCE.contract}>near/contracts/bound/src/lib.rs</A>. Amounts
        are <C>U128</C> decimal strings in mock USDC base units (6 decimals);
        times are unix seconds. A panic message starts with the error code, for
        example <C>FloatExceeded: amount 500000000 &gt; float 9000000</C>.
      </P>
      <UL>
        <li>
          Roles are checked with <C>predecessor_account_id</C>, never the
          signer.
        </li>
        <li>
          Every mutating method needs exactly 1 yoctoNEAR or its storage
          deposit, except <C>pay</C>, <C>ft_on_transfer</C> and the private
          callback.
        </li>
        <li>No admin setters: the configuration is fixed at init.</li>
        <li>
          <C>new(owner, token, treasury, arbiter, config)</C> is the{" "}
          <C>#[init]</C> method, called in the same transaction as the deploy.
        </li>
      </UL>

      {METHODS.map((g) => (
        <section key={g.id} className="space-y-3">
          <H2 id={g.id}>{g.group}</H2>
          {g.items.map((m) => (
            <MethodCard key={m.name} m={m} />
          ))}
        </section>
      ))}

      <H2 id="deposit-msg">ft_transfer_call msg</H2>
      <P>
        Send mock USDC with <C>ft_transfer_call</C> to <C>{BOUND_CONTRACT}</C>.
        An empty msg credits the sender. The sender (or the credited account)
        must already be registered on Bound.
      </P>
      <CodeBlock
        lang="json"
        code={`""                                        credit the sender
{"credit":{"account_id":"x.testnet"}}     credit another registered account
{"stake":{}}                              credit, then stake all of it
{"reserve":{"cert_id":0}}                 credit, then fund that reserve
{"float":{"cert_id":0}}                   credit, then fund that float`}
      />

      <H2 id="views">Views</H2>
      <Table
        head={["View", "Returns", "Notes"]}
        rows={VIEWS.map(([v, r, n]) => [
          <C key="v">{v}</C>,
          <span key="r" className="font-address text-xs">
            {r}
          </span>,
          n,
        ])}
      />
      <H3 id="certview">CertView</H3>
      <P>
        <C>cert_id</C>, <C>status</C>, <C>deal</C>, <C>operator</C>,{" "}
        <C>agent</C>, <C>auditor</C>, <C>bound</C>, <C>reserve_promised</C>,{" "}
        <C>reserve_locked</C>, <C>allocation</C>, <C>coverage</C>,{" "}
        <C>premium</C>, <C>float</C>, <C>float_cap</C>, <C>spent</C>,{" "}
        <C>post_expiry_spent</C>, <C>pay_count</C>, <C>allowlist</C>,{" "}
        <C>expires_at</C>, <C>settlement_deadline</C>, <C>halted</C>,{" "}
        <C>window_closes_at</C>, <C>open_claims</C>, <C>settlement</C>,{" "}
        <C>now</C>. See <A href="/docs/how-it-works#statuses">statuses</A>.
      </P>
      <H3 id="settlement">Settlement</H3>
      <P>
        <C>mode</C> (<C>fraud</C> or <C>hygiene</C>), <C>settled_at</C>,{" "}
        <C>admitted</C>, <C>payable</C>, <C>reserve_draw</C>, <C>victim_paid</C>
        , <C>fee_paid</C>, <C>slash</C>, <C>slash_to_victims</C>,{" "}
        <C>to_treasury</C>, <C>auditor_returned</C> (the allocation left
        unslashed, which stays locked until <C>release_allocation</C>; the name
        predates that rule) and <C>hygiene_bounty_paid</C>.
      </P>
      <H3 id="verdicts">Challenge verdicts</H3>
      <P>
        <C>Pending</C>, <C>Rejected</C> (bond to the treasury),{" "}
        <C>Unadjudicated</C> (half the bond back), <C>Cured</C> (bond back),{" "}
        <C>Upheld</C> (settled, bond back).
      </P>

      <H2 id="config">Configuration on testnet</H2>
      <Table
        head={["Field", "Value", "Meaning"]}
        rows={[
          [
            "claim_window_secs",
            String(cfg.claim_window_secs),
            "length of a claim window (production would be 72 h)",
          ],
          [
            "post_expiry_secs",
            String(cfg.post_expiry_secs),
            "expires_at + this = settlement deadline (production 7 d)",
          ],
          [
            "grace_secs",
            String(cfg.grace_secs),
            "post-expiry spend inside this is not counted (production 24 h)",
          ],
          ["min_stake", String(cfg.min_stake), "minimum allocation (10 mUSDC)"],
          [
            "min_challenge_bond",
            String(cfg.min_challenge_bond),
            "minimum bond (10 mUSDC)",
          ],
          [
            "challenger_fee_bps",
            String(cfg.challenger_fee_bps),
            "challenger fee, bps of proven harm",
          ],
          [
            "de_minimis_bps",
            String(cfg.de_minimis_bps),
            "ExpiredSpend threshold, bps of bound",
          ],
          [
            "hygiene_bounty",
            String(cfg.hygiene_bounty),
            "flat bounty from the reserve (10 mUSDC)",
          ],
          [
            "protocol_fee_bps",
            String(cfg.protocol_fee_bps),
            "treasury share of the premium",
          ],
        ].map(([f, v, m]) => [
          <C key="f">{f}</C>,
          <span key="v" className="font-address">
            {v}
          </span>,
          m,
        ])}
      />
      <P>
        Limits: 16 claims per window, 16 allowlist entries, 64-byte memo,
        256-byte evidence URI, 50 certificates per <C>list_certs</C> page.
        Storage: 0.01 NEAR to register, 0.05 NEAR per <C>publish</C>, 0.01 NEAR
        per <C>challenge</C>; each method measures the bytes it writes and
        panics with <C>StorageNotCovered</C> if the deposit does not cover them.
      </P>

      <H2 id="events">Events</H2>
      <P>
        NEP-297 logs with standard <C>bound</C>, version <C>1.0.0</C>:{" "}
        <C>register</C>, <C>deposit</C>, <C>withdraw</C>, <C>withdraw_failed</C>
        , <C>stake</C>, <C>unstake</C>, <C>publish</C>, <C>accept</C>,{" "}
        <C>fund_reserve</C>, <C>fund_float</C>, <C>attest</C>, <C>pay</C>,{" "}
        <C>halt</C>, <C>resume</C>, <C>clawback</C>, <C>challenge</C>,{" "}
        <C>challenge_rejected</C>, <C>resolve</C>, <C>window_closed</C>,{" "}
        <C>settle</C>, <C>release_reserve</C>, <C>release_allocation</C>.
      </P>
      <CodeBlock
        lang="text"
        title="pay event"
        code={`EVENT_JSON:{"standard":"bound","version":"1.0.0","event":"pay","data":[{"cert_id":1,"agent":"bound-agent2-mwfnc6q8.testnet","to":"bound-service-mwfnc6q8.testnet","amount":"1000000","memo":"mcp tool call","spent":"1000000"}]}`}
      />

      <H2 id="call-example">Calling it</H2>
      <CodeBlock
        lang="sh"
        code={`near contract call-function as-read-only ${BOUND_CONTRACT} get_config json-args '{}' network-config testnet now
near contract call-function as-read-only ${BOUND_CONTRACT} verify json-args '{"agent":"bound-agent2-mwfnc6q8.testnet"}' network-config testnet now`}
      />

      <H2 id="token">Mock USDC token</H2>
      <P>
        <C>{TOKEN_CONTRACT}</C>, source{" "}
        <A href={SOURCE.token}>near/contracts/mock-usdc/src/lib.rs</A>. A plain
        NEP-141 / NEP-145 / NEP-148 token built on{" "}
        <C>near-contract-standards</C>: name &quot;Bound Mock USDC (testnet play
        money)&quot;, symbol <C>mUSDC</C>, 6 decimals.
      </P>
      <UL>
        <li>
          <C>mint(account_id, amount)</C> is open: anyone can mint up to
          1,000,000 USDC per call to any account, and it registers the account
          on the token if needed. It is play money, not Circle USDC.
        </li>
        <li>
          The standard <C>ft_transfer</C>, <C>ft_transfer_call</C>,{" "}
          <C>ft_balance_of</C>, <C>ft_total_supply</C>, <C>ft_metadata</C>,{" "}
          <C>storage_deposit</C>, <C>storage_withdraw</C>,{" "}
          <C>storage_unregister</C>, <C>storage_balance_bounds</C> and{" "}
          <C>storage_balance_of</C> are the near-contract-standards ones.
        </li>
        <li>
          <C>withdraw</C> on Bound fails and re-credits if the caller is not
          registered on the token; call the token&apos;s <C>storage_deposit</C>{" "}
          and withdraw again.
        </li>
      </UL>
      <Note>
        <p>
          Unit tests live in <A href={SOURCE.tests}>src/tests.rs</A>;{" "}
          <A href="/docs/security">Security</A> maps the checklist to them.
        </p>
      </Note>
    </DocArticle>
  );
}
