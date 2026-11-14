import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { clsx } from "clsx";
// Fundations
import { GradientHero } from "@/components/navy/gradient-hero";
import { Section } from "@/components/navy/section";
import { Text } from "@/components/navy/text";
import { Wrapper } from "@/components/navy/wrapper";
// Components
import {
  AccountLink,
  Amount,
  Code,
  Fact,
  FactList,
  SectionHead,
  StatusLabel,
  Unreadable,
} from "@/components/near/app/ui";
import { Stats } from "@/components/near/app/stats";
import { WindowCountdown } from "@/components/app/near/window-countdown";
// Content
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

const backLink =
  "text-inverse-foreground/70 hover:text-inverse-foreground focus-visible:ring-primary/30 rounded-sm text-sm transition-colors focus-visible:ring-3 focus-visible:outline-none";
const inlineLink =
  "rounded-sm underline decoration-1 underline-offset-4 transition-colors focus-visible:ring-3 focus-visible:ring-primary/30 focus-visible:outline-none";

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
      <GradientHero labelledBy="cert-heading">
        <Link href="/app/near" className={backLink}>
          Bound on NEAR
        </Link>
        <Text
          tag="h1"
          id="cert-heading"
          variant="displayLG"
          className="text-inverse-foreground mt-6 tracking-tight text-balance"
        >
          NEAR certificate #{id}
        </Text>
        <Text
          tag="p"
          variant="textBase"
          className="text-inverse-foreground/70 mt-6 max-w-xl text-pretty"
        >
          Certificate #{id} could not be read from testnet just now. That is a
          failure to get an answer, not an answer; reload in a few seconds.
        </Text>
      </GradientHero>
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
    <>
      <GradientHero labelledBy="cert-heading">
        <Link href="/app/near" className={backLink}>
          Bound on NEAR
        </Link>
        <div className="mt-10 flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <Text
            tag="p"
            variant="textXS"
            className="text-inverse-foreground/70 uppercase"
          >
            NEAR certificate #{view.cert_id}
          </Text>
          <StatusLabel
            status={view.status}
            halted={view.halted}
            tone="inverse"
          />
        </div>
        <Text
          tag="h1"
          id="cert-heading"
          variant="displayLG"
          className="text-inverse-foreground mt-6 tracking-tight break-all"
        >
          {view.agent}
        </Text>
      </GradientHero>

      <section aria-label="Verdict">
        <Wrapper className="pt-24 pb-24">
          <div
            role="status"
            className={clsx("p-8 lg:p-10", a.deal ? "bg-primary" : "bg-muted")}
          >
            <Text
              tag="p"
              variant="displaySM"
              className={clsx(
                "max-w-3xl tracking-tight text-balance",
                a.deal ? "text-primary-foreground" : "text-foreground",
              )}
            >
              {a.deal
                ? "A counterparty may deal with this agent: the reserve is locked, an auditor has staked behind it, and its spend is metered."
                : `A counterparty should refuse: ${a.reason.toLowerCase()}.`}
            </Text>
            <Text
              tag="p"
              variant="textSM"
              className={clsx(
                "mt-2",
                a.deal ? "text-primary-foreground/75" : "text-muted-foreground",
              )}
            >
              Read at block time {isoUtc(view.now)}.
              {run ? (
                <>
                  {" "}
                  Created by demo run{" "}
                  <Link
                    className={clsx(
                      inlineLink,
                      a.deal ? "text-primary-foreground" : "text-foreground",
                    )}
                    href={`/app/near/run/${run.runId}`}
                  >
                    {run.runId}
                  </Link>
                  .
                </>
              ) : null}
            </Text>
          </div>
        </Wrapper>
      </section>

      <CoverageSection view={view} />
      <MeterSection view={view} />

      <Section
        label="Key confinement"
        aria-labelledby="keys-heading"
        wrapperClassName="pb-24"
      >
        <SectionHead
          id="keys-heading"
          title={
            <>
              The agent&apos;s keys (<em>confinement</em> proof)
            </>
          }
        />
        {keys === null ? (
          <Unreadable what="The agent's access key list" className="mt-6" />
        ) : (
          <>
            <Text
              tag="p"
              variant="textBase"
              className={clsx(
                "mt-6 max-w-2xl font-medium text-pretty",
                keys.confined ? "text-primary" : "text-foreground",
              )}
            >
              {keys.summary}.
            </Text>
            <FactList className="mt-10">
              {keys.functionCall.map((k) => (
                <Fact
                  key={k.publicKey}
                  label="FunctionCall key"
                  note={<span className="break-all">{k.publicKey}</span>}
                >
                  receiver <span className="text-foreground">{k.receiver}</span>{" "}
                  · methods [{k.methods.join(", ")}] · gas allowance{" "}
                  {k.allowanceNear ?? "unlimited"} NEAR
                </Fact>
              ))}
              {keys.fullAccess > 0 ? (
                <Fact label="FullAccess keys">
                  {keys.fullAccess} FullAccess key
                  {keys.fullAccess === 1 ? "" : "s"}
                </Fact>
              ) : null}
              <Fact label="Contract code on the account (view_account.code_hash)">
                <span className="break-all">
                  {keys.codeHash ?? "could not be read"}
                </span>
                <span className="text-muted-foreground">
                  {keys.codeHash === NO_CODE_HASH
                    ? " (none)"
                    : keys.codeHash
                      ? " (code deployed: it runs as the agent without a key)"
                      : ""}
                </span>
              </Fact>
              <Fact label="Global contract (view_account.global_contract_hash / global_contract_account_id)">
                <span className="break-all">
                  {keys.codeHash === null
                    ? "could not be read"
                    : (keys.globalContract ?? "none")}
                </span>
                {keys.globalContract ? (
                  <span className="text-muted-foreground">
                    {" "}
                    (its code runs as the agent without a key)
                  </span>
                ) : null}
              </Fact>
            </FactList>
            <Text
              tag="p"
              variant="textSM"
              className="text-muted-foreground mt-6 max-w-2xl text-pretty"
            >
              A function-call key cannot attach a deposit and cannot reach any
              other contract, so NEAR itself (not this contract, not an SDK)
              refuses an <Code>ft_transfer</Code>, a <Code>withdraw</Code> or a
              plain NEAR transfer signed with it. Check it yourself:
            </Text>
            <p className="bg-muted text-foreground mt-4 max-w-2xl px-4 py-3 text-sm break-all">
              <Code>
                near account list-keys {view.agent} network-config testnet now
              </Code>
            </p>
            <Text
              tag="p"
              variant="textSM"
              className="text-muted-foreground mt-4 max-w-2xl text-pretty"
            >
              Keys are only half of it: code deployed on the agent account, or a
              global contract it uses, would run as the agent with no key, so
              the account must also have no contract code (code_hash of all
              ones) and no global contract (a global-contract account also shows
              code_hash of all ones, so both global_contract fields must be
              empty). The Bound contract cannot see any of this, which is why
              this page reads it.
            </Text>
          </>
        )}
      </Section>

      <ClaimsSection view={view} challenges={challenges} />
      {view.settlement ? (
        <SettlementSection s={view.settlement} view={view} />
      ) : null}
      <ParticipantsSection view={view} />
    </>
  );
}

function CoverageSection({ view }: { view: CertView }) {
  const c = coverage(view);
  return (
    <Section
      label="Coverage"
      wrapperClassName="pb-24"
      aria-labelledby="coverage-heading"
    >
      <SectionHead
        id="coverage-heading"
        title={
          <>
            What stands <em>behind</em> it
          </>
        }
        intro={
          <>
            Coverage is the most that arbiter-upheld victims of this certificate
            recover together: first from the operator&apos;s reserve, then from
            the auditor&apos;s slashed stake for what the reserve could not
            cover. Every service extending credit to this agent shares it. The
            arbiter is the Bound team&apos;s own account on testnet.
          </>
        }
      />
      <Stats
        cols={2}
        className="mt-12"
        stats={[
          {
            value: formatMusdc(c.victimCover),
            unit: "mUSDC",
            smallUnit: true,
            label:
              view.status === "Verified"
                ? "Coverage (reserve + auditor stake)"
                : "Still held (not active coverage)",
          },
          {
            value: formatMusdc(view.bound),
            unit: "mUSDC",
            smallUnit: true,
            label: "Bound (spend meter, not a guarantee)",
          },
          {
            value: formatMusdc(view.reserve_locked),
            unit: `/ ${formatMusdc(view.reserve_promised)}`,
            smallUnit: true,
            label: "Reserve locked / promised",
            text:
              c.reserveFull || view.settlement
                ? undefined
                : "Locked is short of what was promised.",
          },
          {
            value: formatMusdc(view.allocation),
            unit: "mUSDC",
            smallUnit: true,
            label: "Auditor stake allocated",
          },
        ]}
      />
      <FactList className="mt-12">
        <Fact label="Premium paid at attest">
          <Amount value={formatMusdc(view.premium)} />
        </Fact>
        <Fact label="Expires">
          {isoUtc(view.expires_at)}
          {view.expires_at > view.now
            ? ` (in ${formatDuration(view.expires_at - view.now)})`
            : " (past)"}
        </Fact>
      </FactList>
    </Section>
  );
}

function MeterSection({ view }: { view: CertView }) {
  const pct = percentOf(view.spent, view.bound) ?? 0;
  return (
    <Section
      label="Spend meter"
      aria-labelledby="meter-heading"
      wrapperClassName="pb-24"
    >
      <SectionHead
        id="meter-heading"
        title={
          <>
            Spend <em>meter</em>
          </>
        }
        intro="Spend is gross flow to counterparties, not loss."
      />
      <div className="mt-12">
        <Stats
          stats={[{ value: String(pct), unit: "%", label: "Spent vs bound" }]}
        />
        <div
          className="bg-muted mt-6 h-2 overflow-hidden"
          role="meter"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Spent as a share of the bound"
        >
          <div
            className={clsx("h-full", pct > 100 ? "bg-inverse" : "bg-primary")}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      </div>
      <FactList className="mt-10">
        <Fact label="Spent through pay">
          <Amount value={formatMusdc(view.spent)} /> in {view.pay_count} payment
          {view.pay_count === 1 ? "" : "s"}
        </Fact>
        <Fact label="Float left / cap">
          <Amount
            value={`${formatMusdc(view.float)} / ${formatMusdc(view.float_cap)}`}
          />
        </Fact>
        <Fact label="Spent after expiry">
          <Amount value={formatMusdc(view.post_expiry_spent)} />
        </Fact>
        <Fact label="Recipient allowlist">
          {view.allowlist === null
            ? "any registered account"
            : view.allowlist.join(", ")}
        </Fact>
        <Fact label="Operator halt">
          {view.halted ? "halted" : "not halted"}
        </Fact>
      </FactList>
    </Section>
  );
}

function ClaimsSection({
  view,
  challenges,
}: {
  view: CertView;
  challenges: Awaited<ReturnType<typeof getChallengesForCert>>;
}) {
  const w = windowState(view);
  return (
    <Section
      label="Claims"
      aria-labelledby="claims-heading"
      wrapperClassName="pb-24"
    >
      <SectionHead
        id="claims-heading"
        title={
          <>
            Claims and the <em>claim window</em>
          </>
        }
      />
      <div className="border-border mt-10 border-t pt-6">
        <Text
          tag="p"
          variant="textXS"
          className="text-muted-foreground uppercase"
        >
          Claim window
        </Text>
        <Text
          tag="p"
          variant="textBase"
          className="text-foreground mt-3 max-w-2xl text-pretty"
        >
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
        </Text>
      </div>
      {challenges === null ? (
        <Unreadable what="The challenge list" className="mt-6" />
      ) : challenges.length === 0 ? (
        <Text tag="p" variant="textSM" className="text-muted-foreground mt-6">
          No claims filed.
        </Text>
      ) : (
        <ol className="border-border mt-10 flex flex-col border-b">
          {challenges.map((c) => {
            const ev = proofEvidence(c.proof);
            return (
              <li
                key={c.challenge_id}
                className="border-border flex flex-col gap-3 border-t py-8"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <Text
                    tag="h3"
                    variant="textBase"
                    className="text-foreground font-medium"
                  >
                    #{c.challenge_id} {proofLabel(c.proof)}
                  </Text>
                  <Text
                    tag="span"
                    variant="textXS"
                    className={clsx(
                      "font-medium uppercase",
                      c.verdict === "Upheld"
                        ? "text-primary"
                        : c.verdict === "Rejected"
                          ? "text-foreground"
                          : "text-muted-foreground",
                    )}
                  >
                    {c.verdict}
                  </Text>
                </div>
                <Text
                  tag="p"
                  variant="textSM"
                  className="text-muted-foreground max-w-2xl wrap-anywhere"
                >
                  by <span className="text-foreground">{c.challenger}</span> for
                  victim <span className="text-foreground">{c.victim}</span> ·
                  bond {formatMusdc(c.bond)} · filed {isoUtc(c.filed_at)}
                  {c.adjudicated
                    ? ` · arbiter: ${c.proven ? "proven" : "not proven"}, harm ${formatMusdc(c.harm)}`
                    : ""}
                  {ev ? (
                    <>
                      {" "}
                      · evidence <span className="text-foreground">{ev}</span>
                    </>
                  ) : null}
                </Text>
                {c.verdict === "Rejected" ? (
                  <Text
                    tag="p"
                    variant="textSM"
                    className="text-muted-foreground"
                  >
                    The bond went to the treasury in the same transaction.
                  </Text>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </Section>
  );
}

const th = "px-5 py-4 text-left align-bottom font-normal whitespace-nowrap";
const td = "px-5 py-4 align-top";

function SettlementSection({ s, view }: { s: Settlement; view: CertView }) {
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
    [
      "Unslashed allocation (released at deadline)",
      s.auditor_returned,
      "allocation minus slash",
    ],
    ["Hygiene bounty", s.hygiene_bounty_paid, "trustless hygiene claims only"],
  ];
  return (
    <Section
      label="Settlement"
      aria-labelledby="settle-heading"
      wrapperClassName="pb-24"
      full={
        <div className="overflow-x-auto">
          <table className="w-full min-w-xl text-sm">
            <thead className="border-border border-b">
              <tr className="text-muted-foreground text-xs uppercase">
                <th scope="col" className={th}>
                  Step
                </th>
                <th scope="col" className={th}>
                  Rule
                </th>
                <th scope="col" className={th}>
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, v, why], i) => (
                <tr key={label} className={clsx(i % 2 === 0 && "bg-muted")}>
                  <th
                    scope="row"
                    className={clsx(
                      td,
                      "text-foreground text-left font-medium",
                    )}
                  >
                    {label}
                  </th>
                  <td className={clsx(td, "text-muted-foreground")}>{why}</td>
                  <td className={clsx(td, "text-foreground")}>
                    <Amount value={formatMusdc(v)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    >
      <SectionHead
        id="settle-heading"
        title={`Settlement (${s.mode})`}
        intro={
          <>
            Settled {isoUtc(s.settled_at)} with {s.admitted} admitted claim
            {s.admitted === 1 ? "" : "s"}, in one transaction. Certificate is
            now {view.status}.
          </>
        }
      />
    </Section>
  );
}

async function ParticipantsSection({ view }: { view: CertView }) {
  const people: Array<[string, string]> = [
    ["Operator", view.operator],
    ["Agent", view.agent],
    ["Auditor", view.auditor],
  ];
  const balances = await Promise.all(people.map(([, id]) => getBalances(id)));
  return (
    <Section
      label="Participants"
      aria-labelledby="people-heading"
      wrapperClassName="pb-32"
      full={
        <div className="overflow-x-auto">
          <table className="w-full min-w-2xl text-sm">
            <thead className="border-border border-b">
              <tr className="text-muted-foreground text-xs uppercase">
                <th scope="col" className={th}>
                  Role
                </th>
                <th scope="col" className={th}>
                  Account
                </th>
                <th scope="col" className={th}>
                  Bound balance
                </th>
                <th scope="col" className={th}>
                  Wallet
                </th>
              </tr>
            </thead>
            <tbody>
              {people.map(([role, id], i) => (
                <tr key={role} className={clsx(i % 2 === 0 && "bg-muted")}>
                  <th
                    scope="row"
                    className={clsx(
                      td,
                      "text-foreground text-left font-medium",
                    )}
                  >
                    {role}
                  </th>
                  <td className={td}>
                    <AccountLink id={id} />
                  </td>
                  <td className={clsx(td, "text-foreground tabular-nums")}>
                    {balances[i].bound === null
                      ? "?"
                      : formatMusdc(balances[i].bound!)}{" "}
                    <span className="text-xs opacity-70">mUSDC</span>
                  </td>
                  <td className={clsx(td, "text-foreground tabular-nums")}>
                    {balances[i].token === null
                      ? "?"
                      : formatMusdc(balances[i].token!)}{" "}
                    <span className="text-xs opacity-70">mUSDC</span>
                  </td>
                </tr>
              ))}
              <tr className={clsx(people.length % 2 === 0 && "bg-muted")}>
                <th
                  scope="row"
                  className={clsx(td, "text-foreground text-left font-medium")}
                >
                  Contract
                </th>
                <td className={td}>
                  <AccountLink id={BOUND_CONTRACT} />
                </td>
                <td className={td} />
                <td className={td} />
              </tr>
            </tbody>
          </table>
        </div>
      }
    >
      <SectionHead id="people-heading" title="Participants" />
    </Section>
  );
}
