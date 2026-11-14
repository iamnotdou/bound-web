import type { Metadata } from "next";
import { LegacyNearHome } from "@/components/near/app/legacy/home";
import { NEAR_ONLY } from "@/lib/site";
import Link from "next/link";
import { clsx } from "clsx";
// Fundations
import { ArrowLink } from "@/components/navy/arrow-link";
import { Button } from "@/components/navy/button";
import { CtaPanel } from "@/components/navy/cta-panel";
import { GradientHero } from "@/components/navy/gradient-hero";
import { grid, mainCol, mainStart } from "@/components/navy/grid";
import { Input } from "@/components/navy/input";
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
  TxLink,
  Unreadable,
} from "@/components/near/app/ui";
// Content
import {
  BOUND_CONTRACT,
  CURRENT_RUNS,
  DEMO_RUNS,
  NEAR_DEPLOYMENT,
  SAMPLE_AGENTS,
  supersededLabel,
} from "@/lib/near/deployment";
import {
  assess,
  coverage,
  formatMusdc,
  isNearAccountId,
  isoUtc,
  type CertView,
  type Confinement,
} from "@/lib/near/format";
import {
  getConfinement,
  getDeploymentFacts,
  listCerts,
  verifyAgent,
} from "@/lib/near/bound";

// Chain facts that are the same for every visitor. A verify query makes the
// page dynamic anyway; the cached shell is the list and the deployment.
export const revalidate = 15;

export const metadata: Metadata = {
  title: { absolute: "Bound on NEAR testnet" },
  description:
    "Verify a NEAR agent's Bound certificate before dealing with it: reserve, auditor stake, spend meter and settlement, read live from testnet with no wallet.",
};

const inlineLink =
  "rounded-sm underline decoration-1 underline-offset-4 transition-colors focus-visible:ring-3 focus-visible:ring-primary/30 focus-visible:outline-none";

export default async function NearPage({
  searchParams,
}: PageProps<"/app/near">) {
  // The main site keeps the pre-Navy page; only the NEAR build is Navy.
  if (!NEAR_ONLY) return <LegacyNearHome searchParams={searchParams} />;
  const { agent: raw } = await searchParams;
  const agent = (Array.isArray(raw) ? raw[0] : raw)?.trim().toLowerCase() ?? "";

  const valid = agent !== "" && isNearAccountId(agent);
  const [facts, certs, lookup, keys] = await Promise.all([
    getDeploymentFacts(),
    listCerts(),
    valid ? verifyAgent(agent) : Promise.resolve(null),
    valid ? getConfinement(agent) : Promise.resolve(null),
  ]);

  return (
    <>
      <Hero agent={agent} />

      {agent ? (
        <section aria-label="Verdict">
          <Wrapper>
            <VerifyResult agent={agent} lookup={lookup} keys={keys} />
          </Wrapper>
        </section>
      ) : null}

      <Section label="Certificates" aria-labelledby="certs-heading">
        <SectionHead
          id="certs-heading"
          title={
            <>
              Certificates on the <em>contract</em>
            </>
          }
        />
        {certs === null ? (
          <Unreadable what="The certificate list" className="mt-6" />
        ) : (
          <CertTable certs={certs} />
        )}
      </Section>

      <Section
        label="Runs"
        aria-labelledby="runs-heading"
        wrapperClassName="pb-24"
      >
        <SectionHead
          id="runs-heading"
          title={
            <>
              Recorded demo runs, <em>re-checkable</em> against the chain
            </>
          }
          intro={
            <>
              Each run is the committed output of <Code>pnpm near:demo</Code>.
              Its page asks an archival node for the status of every transaction
              hash it claims, so the record is checked, not trusted.
            </>
          }
        />
        <ul className="border-border mt-12 flex flex-col border-b">
          {DEMO_RUNS.map((r) => (
            <li key={r.runId} className="border-border border-t">
              <Link
                href={`/app/near/run/${r.runId}`}
                className="group focus-visible:ring-primary/30 flex flex-col gap-4 py-5 focus-visible:ring-3 focus-visible:outline-none sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="min-w-0">
                  <Text
                    tag="span"
                    variant="textBase"
                    className="text-foreground block font-medium"
                  >
                    Run {r.runId}
                    {r.superseded ? ` (superseded ${supersededLabel(r)})` : ""}
                  </Text>
                  <Text
                    tag="span"
                    variant="textSM"
                    className="text-muted-foreground mt-1 block"
                  >
                    {r.steps.length} steps,{" "}
                    {r.steps.filter((s) => s.hash).length} transactions,{" "}
                    {r.asserts.length} assertions,{" "}
                    {r.startedAt.slice(0, 16).replace("T", " ")} UTC
                  </Text>
                </span>
                <ArrowLink tag="span" className="shrink-0">
                  Open the run
                </ArrowLink>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        label="Deployment"
        aria-labelledby="deploy-heading"
        wrapperClassName="pb-32"
      >
        <SectionHead id="deploy-heading" title="Deployment" />
        <FactList className="mt-12">
          {facts.contracts.map((c) => (
            <Fact key={c.accountId} label={<AccountLink id={c.accountId} />}>
              {c.matches === null ? (
                <span className="text-muted-foreground">
                  code hash unreadable
                </span>
              ) : (
                <span
                  className={c.matches ? "text-primary" : "text-foreground"}
                >
                  on-chain code_hash{" "}
                  <span className="break-all">{c.onChainCodeHash}</span>{" "}
                  <span className={c.matches ? undefined : "font-semibold"}>
                    {c.matches ? "matches" : "DOES NOT match"}
                  </span>{" "}
                  the recorded build
                </span>
              )}
            </Fact>
          ))}
          <Fact label="Certificates / challenges">
            <span className="tabular-nums">
              {facts.certCount ?? "?"} / {facts.challengeCount ?? "?"}
            </span>
          </Fact>
          <Fact label="Treasury balance (forfeited bonds, slashes, protocol fee)">
            {facts.treasuryBalance === null ? (
              "unreadable"
            ) : (
              <Amount value={formatMusdc(facts.treasuryBalance)} />
            )}
          </Fact>
          <Fact label="Arbiter (single account, disclosed)">
            <AccountLink
              id={facts.accounts?.arbiter ?? NEAR_DEPLOYMENT.accounts.arbiter}
            />
          </Fact>
          <Fact label="Token" note={NEAR_DEPLOYMENT.contracts.token.note}>
            <AccountLink id={NEAR_DEPLOYMENT.contracts.token.accountId} />
          </Fact>
          {facts.config ? (
            <Fact label="Config (immutable, demo timers)">
              claim window {facts.config.claim_window_secs}s, post-expiry{" "}
              {facts.config.post_expiry_secs}s, challenger fee{" "}
              {facts.config.challenger_fee_bps / 100}%, min bond{" "}
              {formatMusdc(facts.config.min_challenge_bond)}
            </Fact>
          ) : (
            <Fact label="Config">unreadable</Fact>
          )}
          {NEAR_DEPLOYMENT.txs.map((t) => (
            <Fact key={t.hash} label={t.step}>
              <TxLink hash={t.hash} size="sm" />
            </Fact>
          ))}
        </FactList>
        <Text
          tag="p"
          variant="textSM"
          className="text-muted-foreground mt-6 max-w-2xl text-pretty"
        >
          The contract account still holds its deployer&apos;s full-access key,
          so its code could be replaced. The code_hash comparison above is how
          you check it has not been: it is the sha256 of the wasm built from the
          tagged commit (
          {NEAR_DEPLOYMENT.contracts.bound.wasmSha256.slice(0, 12)}
          ...).
        </Text>
      </Section>
    </>
  );
}

function Hero({ agent }: { agent: string }) {
  const sample = SAMPLE_AGENTS[0];
  return (
    <>
      <GradientHero labelledBy="near-heading">
        <Text
          tag="p"
          variant="textXS"
          className="text-inverse-foreground/70 uppercase"
        >
          NEAR testnet, read-only, no wallet needed
        </Text>
        <Text
          tag="h1"
          id="near-heading"
          variant="displayLG"
          className="text-inverse-foreground mt-6 max-w-3xl tracking-tight text-balance"
        >
          Know an agent&apos;s <em>worst case</em> before you deal with it
        </Text>
      </GradientHero>
      <section aria-label="Verify an agent">
        <Wrapper className={clsx("grid pb-24", grid)}>
          <div className={clsx("min-w-0", mainCol, mainStart)}>
            <Text
              tag="p"
              variant="textBase"
              className="text-muted-foreground mb-12 max-w-xl text-pretty"
            >
              A Bound certificate puts a pre-funded reserve and an
              auditor&apos;s slashable stake behind a NEAR agent account, and
              the agent&apos;s only key can call nothing but the contract&apos;s
              metered <code className="text-foreground font-sans">pay</code>.
              Every figure below is a view call to{" "}
              <AccountLink id={BOUND_CONTRACT} /> made by this server when the
              page rendered.
            </Text>
            <form
              action="/app/near"
              method="get"
              role="search"
              aria-labelledby="verify-heading"
              className="max-w-xl"
            >
              <Text
                tag="h2"
                id="verify-heading"
                variant="textBase"
                className="text-foreground font-medium"
              >
                Verify an agent
              </Text>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <label htmlFor="agent" className="sr-only">
                  NEAR account id of the agent
                </label>
                <Input
                  id="agent"
                  name="agent"
                  defaultValue={agent}
                  placeholder="agent.testnet"
                  autoComplete="off"
                  spellCheck={false}
                />
                <Button type="submit" variant="accent" className="shrink-0">
                  Verify
                </Button>
              </div>
              {sample ? (
                <Text
                  tag="p"
                  variant="textSM"
                  className="text-muted-foreground mt-4 text-pretty"
                >
                  Try{" "}
                  <Link
                    className={clsx(inlineLink, "text-foreground break-all")}
                    href={`/app/near?agent=${sample.verified}`}
                  >
                    {sample.verified}
                  </Link>{" "}
                  (Verified) or{" "}
                  <Link
                    className={clsx(inlineLink, "text-foreground break-all")}
                    href={`/app/near?agent=${sample.settled}`}
                  >
                    {sample.settled}
                  </Link>{" "}
                  (settled against). Same answer as{" "}
                  <Code>pnpm near:verify &lt;agent&gt;</Code> and{" "}
                  <Code>GET /api/near/verify/&lt;agent&gt;</Code>.
                </Text>
              ) : null}
            </form>
          </div>
        </Wrapper>
      </section>
    </>
  );
}

function VerifyResult({
  agent,
  lookup,
  keys,
}: {
  agent: string;
  lookup: Awaited<ReturnType<typeof verifyAgent>> | null;
  keys: Confinement | null;
}) {
  if (lookup === null) {
    return (
      <Decision
        deal={false}
        title={
          <>
            &quot;{agent}&quot; is <em>not</em> a NEAR account id
          </>
        }
        text="Account ids are lowercase, 2 to 64 characters, like name.testnet."
      />
    );
  }
  if (!lookup.ok) {
    return (
      <Decision
        deal={false}
        title={
          <>
            No <em>answer</em> from testnet
          </>
        }
        text={`The verify call failed. That is not a verdict on ${agent}; reload.`}
      />
    );
  }
  const view = lookup.value;
  const a = assess(view);
  if (!view) {
    return (
      <Decision
        deal={false}
        title={
          <>
            <em>Refuse</em>: {agent} has no Bound certificate
          </>
        }
        text="Nothing stands behind this agent. Ask for prepayment or decline."
      >
        <FactList className="mt-8">
          <ConfinementFact keys={keys} />
        </FactList>
      </Decision>
    );
  }
  const cov = coverage(view);
  return (
    <Decision
      deal={a.deal}
      title={
        a.deal ? (
          <>
            Deal: {agent} is <em>Verified</em>
          </>
        ) : (
          <>
            <em>Refuse</em>: {a.reason}
          </>
        )
      }
      text={
        <>
          Coverage <Amount value={formatMusdc(cov.victimCover)} /> is what
          arbitrated victims of this certificate can recover in total; bound is
          a spend meter, not a guarantee.
        </>
      }
      action={
        <ArrowLink asChild tone={a.deal ? "inverse" : "default"}>
          <Link href={`/app/near/cert/${view.cert_id}`}>
            Full certificate, key confinement and settlement
          </Link>
        </ArrowLink>
      }
    >
      <FactList className="mt-8">
        <Fact label="Certificate">
          #{view.cert_id}, {view.status}
          {view.halted ? ", halted" : ""}
        </Fact>
        <Fact label="Bound">
          <Amount value={formatMusdc(view.bound)} />
        </Fact>
        <Fact label="Coverage">
          <Amount value={formatMusdc(cov.victimCover)} /> (reserve{" "}
          <Amount value={formatMusdc(view.reserve_locked)} /> + auditor stake{" "}
          <Amount value={formatMusdc(view.allocation)} />)
        </Fact>
        <Fact label="Expires">{isoUtc(view.expires_at)}</Fact>
        <ConfinementFact keys={keys} />
      </FactList>
    </Decision>
  );
}

/** Key confinement, read from the agent's access keys and view_account. */
function ConfinementFact({ keys }: { keys: Confinement | null }) {
  return (
    <Fact label="Key confinement">
      {keys === null ? (
        <span>
          could not be read (the access key list did not answer), so it is
          unproven
        </span>
      ) : (
        <>
          <span
            className={clsx(
              "font-medium",
              keys.confined ? "text-primary" : "text-foreground",
            )}
          >
            {keys.confined ? "yes" : "no"}
          </span>
          , {keys.summary}.
        </>
      )}
    </Fact>
  );
}

/**
 * The verdict as a Navy CtaPanel (primary for a deal, muted for a refusal):
 * title and text on the left, the link on the right, and the certificate
 * facts as a hairline list underneath.
 */
function Decision({
  deal,
  title,
  text,
  action,
  children,
}: {
  deal: boolean;
  title: React.ReactNode;
  text: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div role="status">
      <CtaPanel
        tone={deal ? "primary" : "muted"}
        title={<span className="wrap-anywhere">{title}</span>}
        text={text}
      >
        {action}
      </CtaPanel>
      {children}
    </div>
  );
}

const th = "px-5 py-4 text-left align-bottom font-normal whitespace-nowrap";
const td = "px-5 py-4 align-top";

function CertTable({ certs }: { certs: CertView[] }) {
  if (certs.length === 0)
    return (
      <Text tag="p" variant="textSM" className="text-muted-foreground mt-6">
        No certificates yet.
      </Text>
    );
  return (
    <div className="mt-12">
      <Text
        tag="p"
        variant="textXS"
        className="text-muted-foreground sm:hidden"
      >
        Scroll the table sideways for bound, reserve, stake and spent.
      </Text>
      <div className="mt-4 overflow-x-auto sm:mt-0">
        <table className="w-full min-w-3xl text-sm">
          <thead className="border-border border-b">
            <tr className="text-muted-foreground text-xs uppercase">
              <th scope="col" className={th}>
                #
              </th>
              <th scope="col" className={th}>
                Agent
              </th>
              <th scope="col" className={th}>
                Status
              </th>
              <th scope="col" className={th}>
                Bound
              </th>
              <th scope="col" className={th}>
                Reserve
              </th>
              <th scope="col" className={th}>
                Auditor stake
              </th>
              <th scope="col" className={th}>
                Spent
              </th>
            </tr>
          </thead>
          <tbody>
            {certs.map((c, i) => (
              <tr key={c.cert_id} className={clsx(i % 2 === 0 && "bg-muted")}>
                <th scope="row" className={clsx(td, "text-left font-normal")}>
                  <Link
                    href={`/app/near/cert/${c.cert_id}`}
                    className={clsx(inlineLink, "text-foreground font-medium")}
                  >
                    {c.cert_id}
                  </Link>
                </th>
                <td
                  className={clsx(td, "text-foreground max-w-64 truncate")}
                  title={c.agent}
                >
                  {c.agent}
                </td>
                <td className={td}>
                  <StatusLabel status={c.status} halted={c.halted} />
                </td>
                <td className={clsx(td, "text-foreground tabular-nums")}>
                  {formatMusdc(c.bound)}
                </td>
                <td className={clsx(td, "text-foreground tabular-nums")}>
                  {formatMusdc(c.reserve_locked)}
                  <span className="text-muted-foreground">
                    {" "}
                    / {formatMusdc(c.reserve_promised)}
                  </span>
                </td>
                <td className={clsx(td, "text-foreground tabular-nums")}>
                  {formatMusdc(c.allocation)}
                </td>
                <td className={clsx(td, "text-foreground tabular-nums")}>
                  {formatMusdc(c.spent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Text
        tag="p"
        variant="textSM"
        className="text-muted-foreground mt-6 max-w-2xl text-pretty"
      >
        Amounts in mock USDC. Spent is gross flow through the meter, not loss.
        {certOrigins(certs).map((line) => (
          <span key={line}> {line}</span>
        ))}
      </Text>
    </div>
  );
}

/** Where each listed certificate came from, from the committed run records. */
function certOrigins(certs: CertView[]): string[] {
  const lines: string[] = [];
  const known = new Set<number>();
  for (const r of CURRENT_RUNS) {
    const here = certs.map((c) => c.cert_id);
    if (here.includes(r.certId) && here.includes(r.cert2Id)) {
      lines.push(
        `Certificates ${r.certId} and ${r.cert2Id} come from demo run ${r.runId}: #${r.certId} is the settled demo certificate, #${r.cert2Id} is left Verified for judging.`,
      );
    } else if (here.includes(r.certId) || here.includes(r.cert2Id)) {
      const id = here.includes(r.certId) ? r.certId : r.cert2Id;
      lines.push(`Certificate ${id} comes from demo run ${r.runId}.`);
    }
    known.add(r.certId);
    known.add(r.cert2Id);
  }
  const other = certs
    .map((c) => c.cert_id)
    .filter((id) => !known.has(id))
    .sort((a, b) => a - b);
  if (other.length > 0)
    lines.push(
      `${other.length === 1 ? "Certificate" : "Certificates"} ${other.join(", ")} ${other.length === 1 ? "is" : "are"} not from a recorded demo run.`,
    );
  return lines;
}
