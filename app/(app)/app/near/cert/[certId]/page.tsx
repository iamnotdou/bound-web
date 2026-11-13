import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Gauge,
  Gavel,
  KeyRound,
  Scale,
  ShieldCheck,
  Timer,
} from "lucide-react";
import {
  AccountLink,
  Amount,
  NearStatusBadge,
  Panel,
  Row,
  Unreadable,
} from "@/components/app/near/ui";
import { WindowCountdown } from "@/components/app/near/window-countdown";
import {
  getBalances,
  getCert,
  getChallengesForCert,
  getConfinement,
} from "@/lib/near/bound";
import { BOUND_CONTRACT, CURRENT_RUNS } from "@/lib/near/deployment";
import {
  assess,
  coverage,
  NO_CODE_HASH,
  formatDuration,
  formatMusdc,
  isoUtc,
  percentOf,
  proofEvidence,
  proofLabel,
  windowState,
  type CertView,
  type Settlement,
} from "@/lib/near/format";
import { cn } from "@/lib/utils";

export const revalidate = 10;

function parseCertId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) ? n : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/app/near/cert/[certId]">): Promise<Metadata> {
  const { certId } = await params;
  return { title: `NEAR certificate #${certId}` };
}

export default async function NearCertPage({
  params,
}: PageProps<"/app/near/cert/[certId]">) {
  const { certId } = await params;
  const id = parseCertId(certId);
  if (id === null) notFound();
  const lookup = await getCert(id);
  if (lookup.ok && lookup.value === null) notFound();

  if (!lookup.ok || !lookup.value) {
    return (
      <Shell>
        <Unreadable what={`Certificate #${id}`} />
      </Shell>
    );
  }
  const view = lookup.value;
  const [keys, challenges] = await Promise.all([
    getConfinement(view.agent),
    getChallengesForCert(id),
  ]);
  const a = assess(view);
  const run = CURRENT_RUNS.find((r) => r.certId === id || r.cert2Id === id);

  return (
    <Shell>
      <header className="mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-muted-foreground font-mono text-xs uppercase tracking-widest">
            NEAR certificate #{view.cert_id}
          </span>
          <NearStatusBadge status={view.status} halted={view.halted} />
        </div>
        <h1 className="text-foreground font-address mt-3 break-all text-2xl font-semibold tracking-tight sm:text-3xl">
          {view.agent}
        </h1>
        <p
          className={cn(
            "mt-3 text-balance",
            a.deal ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {a.deal
            ? "A counterparty may deal with this agent: the reserve is locked, an auditor has staked behind it, and its spend is metered."
            : `A counterparty should refuse: ${a.reason.toLowerCase()}.`}{" "}
          Read at block time {isoUtc(view.now)}.
          {run ? (
            <>
              {" "}
              Created by demo run{" "}
              <Link className="underline" href={`/app/near/run/${run.runId}`}>
                {run.runId}
              </Link>
              .
            </>
          ) : null}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-x-6 lg:grid-cols-2">
        <CoverageCard view={view} />
        <MeterCard view={view} />
      </div>

      <Panel
        id="keys-heading"
        title="The agent's keys (confinement proof)"
        icon={<KeyRound aria-hidden className="text-primary size-5" />}
      >
        {keys === null ? (
          <Unreadable what="The agent's access key list" />
        ) : (
          <>
            <p
              className={cn(
                "mt-2 text-sm font-medium",
                keys.confined ? "text-primary" : "text-muted-foreground",
              )}
            >
              {keys.summary}.
            </p>
            <ul className="mt-3 space-y-2">
              {keys.functionCall.map((k) => (
                <li
                  key={k.publicKey}
                  className="bg-muted/40 rounded-md p-3 text-xs"
                >
                  <span className="font-address block break-all">
                    {k.publicKey}
                  </span>
                  <span className="text-muted-foreground mt-1 block">
                    FunctionCall · receiver{" "}
                    <span className="font-address text-foreground">
                      {k.receiver}
                    </span>{" "}
                    · methods{" "}
                    <span className="font-address text-foreground">
                      [{k.methods.join(", ")}]
                    </span>{" "}
                    · gas allowance {k.allowanceNear ?? "unlimited"} NEAR
                  </span>
                </li>
              ))}
              {keys.fullAccess > 0 ? (
                <li className="bg-muted/40 rounded-md p-3 text-xs">
                  {keys.fullAccess} FullAccess key
                  {keys.fullAccess === 1 ? "" : "s"}
                </li>
              ) : null}
              <li className="bg-muted/40 rounded-md p-3 text-xs">
                <span className="text-muted-foreground">
                  Contract code on the account (view_account.code_hash):{" "}
                </span>
                <span className="font-address text-foreground break-all">
                  {keys.codeHash ?? "could not be read"}
                </span>
                <span className="text-muted-foreground">
                  {keys.codeHash === NO_CODE_HASH
                    ? " (none)"
                    : keys.codeHash
                      ? " (code deployed: it runs as the agent without a key)"
                      : ""}
                </span>
              </li>
            </ul>
            <p className="text-muted-foreground mt-3 text-xs text-balance">
              A function-call key cannot attach a deposit and cannot reach any
              other contract, so NEAR itself (not this contract, not an SDK)
              refuses an <code>ft_transfer</code>, a <code>withdraw</code> or a
              plain NEAR transfer signed with it. Check it yourself:{" "}
              <code className="font-address bg-muted/60 mt-1 block rounded px-2 py-1 break-all">
                near account list-keys {view.agent} network-config testnet now
              </code>
              Keys are only half of it: code deployed on the agent account would
              run as the agent with no key, so the account must also have no
              contract code (code_hash of all ones). The Bound contract cannot
              see either, which is why this page reads both.
            </p>
          </>
        )}
      </Panel>

      <ChallengesCard view={view} challenges={challenges} />
      {view.settlement ? (
        <SettlementCard s={view.settlement} view={view} />
      ) : null}
      <ParticipantsCard view={view} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
      <Link
        href="/app/near"
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 rounded text-sm transition-colors focus-visible:outline-none focus-visible:ring-2"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Bound on NEAR
      </Link>
      {children}
    </div>
  );
}

function CoverageCard({ view }: { view: CertView }) {
  const c = coverage(view);
  return (
    <Panel
      id="coverage-heading"
      title="What stands behind it"
      icon={<ShieldCheck aria-hidden className="text-primary size-5" />}
    >
      <dl className="mt-4 space-y-3">
        <Row label="Coverage (reserve + auditor stake)">
          <Amount value={formatMusdc(c.victimCover)} />
        </Row>
        <Row label="Bound (spend meter, not a guarantee)">
          <Amount value={formatMusdc(view.bound)} />
        </Row>
        <Row label="Reserve locked / promised">
          <span
            className={
              c.reserveFull || view.settlement ? "" : "text-destructive"
            }
          >
            <Amount
              value={`${formatMusdc(view.reserve_locked)} / ${formatMusdc(view.reserve_promised)}`}
            />
          </span>
        </Row>
        <Row label="Auditor stake allocated">
          <Amount value={formatMusdc(view.allocation)} />
        </Row>
        <Row label="Premium paid at attest">
          <Amount value={formatMusdc(view.premium)} />
        </Row>
        <Row label="Expires">
          {isoUtc(view.expires_at)}
          {view.expires_at > view.now
            ? ` (in ${formatDuration(view.expires_at - view.now)})`
            : " (past)"}
        </Row>
      </dl>
      <p className="text-muted-foreground mt-4 text-xs text-balance">
        Coverage is the most that arbiter-upheld victims of this certificate
        recover together: first from the operator&apos;s reserve, then from the
        auditor&apos;s slashed stake for what the reserve could not cover. Every
        service extending credit to this agent shares it. The arbiter is the
        Bound team&apos;s own account on testnet.
      </p>
    </Panel>
  );
}

function MeterCard({ view }: { view: CertView }) {
  const pct = percentOf(view.spent, view.bound) ?? 0;
  return (
    <Panel
      id="meter-heading"
      title="Spend meter"
      icon={<Gauge aria-hidden className="text-primary size-5" />}
    >
      <div className="mt-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-muted-foreground">Spent vs bound</span>
          <span className="tabular-nums">{pct}%</span>
        </div>
        <div
          className="bg-muted mt-2 h-2 overflow-hidden rounded-full"
          role="meter"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Spent as a share of the bound"
        >
          <div
            className={cn(
              "h-full",
              pct > 100 ? "bg-destructive" : "bg-primary",
            )}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      </div>
      <dl className="mt-4 space-y-3">
        <Row label="Spent through pay">
          <Amount value={formatMusdc(view.spent)} /> in {view.pay_count} payment
          {view.pay_count === 1 ? "" : "s"}
        </Row>
        <Row label="Float left / cap">
          <Amount
            value={`${formatMusdc(view.float)} / ${formatMusdc(view.float_cap)}`}
          />
        </Row>
        <Row label="Spent after expiry">
          <Amount value={formatMusdc(view.post_expiry_spent)} />
        </Row>
        <Row label="Recipient allowlist">
          {view.allowlist === null ? (
            "any registered account"
          ) : (
            <span className="font-address text-xs">
              {view.allowlist.join(", ")}
            </span>
          )}
        </Row>
        <Row label="Operator halt">{view.halted ? "halted" : "not halted"}</Row>
      </dl>
      <p className="text-muted-foreground mt-4 text-xs">
        Spend is gross flow to counterparties, not loss.
      </p>
    </Panel>
  );
}

function ChallengesCard({
  view,
  challenges,
}: {
  view: CertView;
  challenges: Awaited<ReturnType<typeof getChallengesForCert>>;
}) {
  const w = windowState(view);
  return (
    <Panel
      id="claims-heading"
      title="Claims and the claim window"
      icon={<Gavel aria-hidden className="text-primary size-5" />}
    >
      <p className="text-foreground mt-2 flex items-center gap-2 text-sm">
        <Timer aria-hidden className="size-4" />
        {w.kind === "none" ? (
          view.settlement ? (
            "Window closed and settled."
          ) : (
            "No claim window open."
          )
        ) : w.kind === "open" ? (
          <>
            Window open with {view.open_claims} claim
            {view.open_claims === 1 ? "" : "s"}, payments frozen;{" "}
            <WindowCountdown secondsLeft={w.secondsLeft} />
          </>
        ) : (
          "Window has passed: anyone may call close_window to settle."
        )}
      </p>
      {challenges === null ? (
        <Unreadable what="The challenge list" />
      ) : challenges.length === 0 ? (
        <p className="text-muted-foreground mt-3 text-sm">No claims filed.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {challenges.map((c) => {
            const ev = proofEvidence(c.proof);
            return (
              <li
                key={c.challenge_id}
                className="ring-foreground/10 rounded-lg p-4 ring-1"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-foreground text-sm font-medium">
                    #{c.challenge_id} {proofLabel(c.proof)}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs ring-1",
                      c.verdict === "Upheld"
                        ? "text-primary ring-primary/30"
                        : c.verdict === "Rejected"
                          ? "text-destructive ring-destructive/30"
                          : "text-muted-foreground ring-foreground/10",
                    )}
                  >
                    {c.verdict}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  by <span className="font-address">{c.challenger}</span> for
                  victim <span className="font-address">{c.victim}</span> · bond{" "}
                  {formatMusdc(c.bond)} · filed {isoUtc(c.filed_at)}
                  {c.adjudicated
                    ? ` · arbiter: ${c.proven ? "proven" : "not proven"}, harm ${formatMusdc(c.harm)}`
                    : ""}
                  {ev ? (
                    <>
                      {" "}
                      · evidence <span className="font-address">{ev}</span>
                    </>
                  ) : null}
                </p>
                {c.verdict === "Rejected" ? (
                  <p className="text-muted-foreground mt-1 text-xs">
                    The bond went to the treasury in the same transaction.
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function SettlementCard({ s, view }: { s: Settlement; view: CertView }) {
  const rows: Array<[string, string, string]> = [
    ["Payable", s.payable, "min(total harm, reserve + allocation)"],
    ["Drawn from reserve", s.reserve_draw, "min(payable, reserve)"],
    [
      "Paid to victims",
      s.victim_paid,
      "reserve draw plus slash top-up, pro rata",
    ],
    [
      "Challenger fees",
      s.fee_paid,
      "10% of harm from what is left of the reserve",
    ],
    ["Auditor slashed", s.slash, "only the part the reserve could not cover"],
    ...(s.slash_to_victims !== undefined
      ? [
          [
            "Slash paid to victims",
            s.slash_to_victims,
            "unpaid arbitrated harm first",
          ] as [string, string, string],
        ]
      : []),
    ["To treasury", s.to_treasury, "leftover slash and undistributed draw"],
    ["Returned to auditor", s.auditor_returned, "allocation minus slash"],
    ["Hygiene bounty", s.hygiene_bounty_paid, "trustless hygiene claims only"],
  ];
  return (
    <Panel
      id="settle-heading"
      title={`Settlement (${s.mode})`}
      icon={<Scale aria-hidden className="text-primary size-5" />}
    >
      <p className="text-muted-foreground mt-2 text-sm">
        Settled {isoUtc(s.settled_at)} with {s.admitted} admitted claim
        {s.admitted === 1 ? "" : "s"}, in one transaction. Certificate is now{" "}
        {view.status}.
      </p>
      <dl className="mt-4 space-y-3">
        {rows.map(([label, v, why]) => (
          <Row
            key={label}
            label={
              <span>
                {label}
                <span className="text-muted-foreground/80 block text-xs">
                  {why}
                </span>
              </span>
            }
          >
            <Amount value={formatMusdc(v)} />
          </Row>
        ))}
      </dl>
    </Panel>
  );
}

async function ParticipantsCard({ view }: { view: CertView }) {
  const people: Array<[string, string]> = [
    ["Operator", view.operator],
    ["Agent", view.agent],
    ["Auditor", view.auditor],
  ];
  const balances = await Promise.all(people.map(([, id]) => getBalances(id)));
  return (
    <Panel id="people-heading" title="Participants">
      <dl className="mt-4 space-y-3">
        {people.map(([role, id], i) => (
          <Row
            key={role}
            label={
              <span>
                {role}
                <span className="text-muted-foreground/80 block text-xs">
                  Bound balance{" "}
                  {balances[i].bound === null
                    ? "?"
                    : formatMusdc(balances[i].bound!)}{" "}
                  · wallet{" "}
                  {balances[i].token === null
                    ? "?"
                    : formatMusdc(balances[i].token!)}{" "}
                  mUSDC
                </span>
              </span>
            }
          >
            <AccountLink id={id} />
          </Row>
        ))}
        <Row label="Contract">
          <AccountLink id={BOUND_CONTRACT} />
        </Row>
      </dl>
    </Panel>
  );
}
