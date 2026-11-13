import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  ListChecks,
  Search,
  ServerCog,
  XCircle,
} from "lucide-react";
import {
  AccountLink,
  Amount,
  NearStatusBadge,
  Panel,
  Row,
  TxLink,
  Unreadable,
} from "@/components/app/near/ui";
import {
  BOUND_CONTRACT,
  DEMO_RUNS,
  NEAR_DEPLOYMENT,
  SAMPLE_AGENTS,
} from "@/lib/near/deployment";
import {
  assess,
  coverage,
  formatMusdc,
  isNearAccountId,
  isoUtc,
  type CertView,
} from "@/lib/near/format";
import { getDeploymentFacts, listCerts, verifyAgent } from "@/lib/near/bound";

// Chain facts that are the same for every visitor. A verify query makes the
// page dynamic anyway; the cached shell is the list and the deployment.
export const revalidate = 15;

export const metadata: Metadata = {
  title: "Bound on NEAR testnet",
  description:
    "Verify a NEAR agent's Bound certificate before dealing with it: reserve, auditor stake, spend meter and settlement, read live from testnet with no wallet.",
};

export default async function NearPage({
  searchParams,
}: PageProps<"/app/near">) {
  const { agent: raw } = await searchParams;
  const agent = (Array.isArray(raw) ? raw[0] : raw)?.trim().toLowerCase() ?? "";

  const [facts, certs, lookup] = await Promise.all([
    getDeploymentFacts(),
    listCerts(),
    agent && isNearAccountId(agent)
      ? verifyAgent(agent)
      : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
      <header>
        <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">
          NEAR testnet · read-only · no wallet needed
        </p>
        <h1 className="text-foreground mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Know an agent&apos;s worst case before you deal with it
        </h1>
        <p className="text-muted-foreground mt-3 max-w-3xl text-balance">
          A Bound certificate puts a pre-funded reserve and an auditor&apos;s
          slashable stake behind a NEAR agent account, and the agent&apos;s only
          key can call nothing but the contract&apos;s metered{" "}
          <code className="font-address">pay</code>. Every figure below is a
          view call to{" "}
          <AccountLink id={BOUND_CONTRACT} className="text-foreground" /> made
          by this server when the page rendered.
        </p>
      </header>

      <VerifyBox agent={agent} />
      {agent ? <VerifyResult agent={agent} lookup={lookup} /> : null}

      <Panel
        id="certs-heading"
        title="Certificates on the contract"
        icon={<FileCheck2 aria-hidden className="text-primary size-5" />}
      >
        {certs === null ? (
          <Unreadable what="The certificate list" />
        ) : (
          <CertTable certs={certs} />
        )}
      </Panel>

      <Panel
        id="runs-heading"
        title="Recorded demo runs, re-checkable against the chain"
        icon={<ListChecks aria-hidden className="text-primary size-5" />}
      >
        <p className="text-muted-foreground mt-2 text-sm text-balance">
          Each run is the committed output of{" "}
          <code className="font-address">pnpm near:demo</code>. Its page asks an
          archival node for the status of every transaction hash it claims, so
          the record is checked, not trusted.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {DEMO_RUNS.map((r) => (
            <li key={r.runId}>
              <Link
                href={`/app/near/run/${r.runId}`}
                className="ring-foreground/10 hover:ring-primary/40 focus-visible:ring-ring flex items-center justify-between gap-3 rounded-lg p-4 ring-1 transition focus-visible:outline-none focus-visible:ring-2"
              >
                <span>
                  <span className="text-foreground block font-medium">
                    Run {r.runId}
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    {r.steps.length} steps,{" "}
                    {r.steps.filter((s) => s.hash).length} transactions,{" "}
                    {r.asserts.length} assertions ·{" "}
                    {r.startedAt.slice(0, 16).replace("T", " ")} UTC
                  </span>
                </span>
                <ArrowRight
                  aria-hidden
                  className="text-muted-foreground size-4"
                />
              </Link>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        id="deploy-heading"
        title="Deployment"
        icon={<ServerCog aria-hidden className="text-primary size-5" />}
      >
        <dl className="mt-4 space-y-3">
          {facts.contracts.map((c) => (
            <Row key={c.accountId} label={<AccountLink id={c.accountId} />}>
              {c.matches === null ? (
                <span className="text-muted-foreground">
                  code hash unreadable
                </span>
              ) : (
                <span
                  className={c.matches ? "text-primary" : "text-destructive"}
                >
                  on-chain code_hash{" "}
                  <span className="font-address">{c.onChainCodeHash}</span>{" "}
                  {c.matches ? "matches" : "DOES NOT match"} the recorded build
                </span>
              )}
            </Row>
          ))}
          <Row label="Certificates / challenges">
            {facts.certCount ?? "?"} / {facts.challengeCount ?? "?"}
          </Row>
          <Row label="Treasury balance (forfeited bonds, slashes, protocol fee)">
            {facts.treasuryBalance === null ? (
              "unreadable"
            ) : (
              <Amount value={formatMusdc(facts.treasuryBalance)} />
            )}
          </Row>
          <Row label="Arbiter (single account, disclosed)">
            <AccountLink
              id={facts.accounts?.arbiter ?? NEAR_DEPLOYMENT.accounts.arbiter}
            />
          </Row>
          <Row label="Token">
            <span>
              <AccountLink id={NEAR_DEPLOYMENT.contracts.token.accountId} />{" "}
              <span className="text-muted-foreground block text-xs">
                {NEAR_DEPLOYMENT.contracts.token.note}
              </span>
            </span>
          </Row>
          {facts.config ? (
            <Row label="Config (immutable, demo timers)">
              <span className="font-address text-xs">
                claim window {facts.config.claim_window_secs}s · post-expiry{" "}
                {facts.config.post_expiry_secs}s · challenger fee{" "}
                {facts.config.challenger_fee_bps / 100}% · min bond{" "}
                {formatMusdc(facts.config.min_challenge_bond)}
              </span>
            </Row>
          ) : (
            <Row label="Config">unreadable</Row>
          )}
          {NEAR_DEPLOYMENT.txs.map((t) => (
            <Row key={t.hash} label={t.step}>
              <TxLink hash={t.hash} />
            </Row>
          ))}
        </dl>
        <p className="text-muted-foreground mt-4 text-xs text-balance">
          The contract account still holds its deployer&apos;s full-access key,
          so its code could be replaced. The code_hash comparison above is how
          you check it has not been: it is the sha256 of the wasm built from the
          tagged commit (
          {NEAR_DEPLOYMENT.contracts.bound.wasmSha256.slice(0, 12)}
          ...).
        </p>
      </Panel>
    </div>
  );
}

function VerifyBox({ agent }: { agent: string }) {
  return (
    <section
      aria-labelledby="verify-heading"
      className="ring-primary/20 bg-card mt-8 rounded-xl p-5 shadow ring-1 sm:p-6"
    >
      <h2
        id="verify-heading"
        className="text-foreground flex items-center gap-2 text-lg font-semibold"
      >
        <Search aria-hidden className="text-primary size-5" />
        Verify an agent
      </h2>
      <form
        action="/app/near"
        method="get"
        className="mt-4 flex flex-col gap-3 sm:flex-row"
      >
        <label htmlFor="agent" className="sr-only">
          NEAR account id of the agent
        </label>
        <input
          id="agent"
          name="agent"
          defaultValue={agent}
          placeholder="agent.testnet"
          autoComplete="off"
          spellCheck={false}
          className="border-input bg-background focus-visible:ring-ring font-address h-10 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2"
        />
        <button
          type="submit"
          className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring h-10 shrink-0 rounded-md px-5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2"
        >
          Verify
        </button>
      </form>
      <p className="text-muted-foreground mt-3 text-xs">
        Try{" "}
        {SAMPLE_AGENTS.slice(0, 1).map((s) => (
          <span key={s.runId}>
            <Link
              className="font-address underline"
              href={`/app/near?agent=${s.verified}`}
            >
              {s.verified}
            </Link>{" "}
            (Verified) or{" "}
            <Link
              className="font-address underline"
              href={`/app/near?agent=${s.settled}`}
            >
              {s.settled}
            </Link>{" "}
            (settled against)
          </span>
        ))}
        . Same answer as{" "}
        <code className="font-address">pnpm near:verify &lt;agent&gt;</code> and{" "}
        <code className="font-address">GET /api/near/verify/&lt;agent&gt;</code>
        .
      </p>
    </section>
  );
}

function VerifyResult({
  agent,
  lookup,
}: {
  agent: string;
  lookup: Awaited<ReturnType<typeof verifyAgent>> | null;
}) {
  if (lookup === null) {
    return (
      <Decision deal={false} title={`"${agent}" is not a NEAR account id`}>
        Account ids are lowercase, 2 to 64 characters, like{" "}
        <span className="font-address">name.testnet</span>.
      </Decision>
    );
  }
  if (!lookup.ok) {
    return (
      <Decision deal={false} title="No answer from testnet">
        The verify call failed. That is not a verdict on {agent}; reload.
      </Decision>
    );
  }
  const view = lookup.value;
  const a = assess(view);
  if (!view) {
    return (
      <Decision
        deal={false}
        title={`Refuse: ${agent} has no Bound certificate`}
      >
        Nothing stands behind this agent. Ask for prepayment or decline.
      </Decision>
    );
  }
  const cov = coverage(view);
  return (
    <Decision
      deal={a.deal}
      title={a.deal ? `Deal: ${agent} is Verified` : `Refuse: ${a.reason}`}
    >
      <span className="block">
        Certificate #{view.cert_id}{" "}
        <NearStatusBadge status={view.status} halted={view.halted} /> · bound{" "}
        <Amount value={formatMusdc(view.bound)} /> · reserve locked{" "}
        <Amount value={formatMusdc(cov.victimCover)} /> · auditor stake behind
        it <Amount value={formatMusdc(view.allocation)} /> · expires{" "}
        {isoUtc(view.expires_at)}
      </span>
      <Link
        href={`/app/near/cert/${view.cert_id}`}
        className="text-primary mt-2 inline-flex items-center gap-1 text-sm font-medium underline"
      >
        Full certificate, key confinement and settlement
        <ArrowRight aria-hidden className="size-4" />
      </Link>
    </Decision>
  );
}

function Decision({
  deal,
  title,
  children,
}: {
  deal: boolean;
  title: string;
  children: React.ReactNode;
}) {
  const Icon = deal ? CheckCircle2 : XCircle;
  return (
    <div
      role="status"
      className={
        deal
          ? "bg-primary/5 ring-primary/30 mt-4 rounded-xl p-5 ring-1"
          : "bg-destructive/5 ring-destructive/30 mt-4 rounded-xl p-5 ring-1"
      }
    >
      <p className="text-foreground flex items-center gap-2 font-semibold">
        <Icon
          aria-hidden
          className={deal ? "text-primary size-5" : "text-destructive size-5"}
        />
        {title}
      </p>
      <div className="text-muted-foreground mt-2 text-sm">{children}</div>
    </div>
  );
}

function CertTable({ certs }: { certs: CertView[] }) {
  if (certs.length === 0)
    return (
      <p className="text-muted-foreground mt-2 text-sm">No certificates yet.</p>
    );
  return (
    <div className="-mx-5 mt-4 overflow-x-auto sm:mx-0">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="text-muted-foreground text-xs uppercase tracking-wide">
          <tr>
            <th className="px-5 py-2 font-medium sm:px-2">#</th>
            <th className="px-2 py-2 font-medium">Agent</th>
            <th className="px-2 py-2 font-medium">Status</th>
            <th className="px-2 py-2 text-right font-medium">Bound</th>
            <th className="px-2 py-2 text-right font-medium">Reserve</th>
            <th className="px-2 py-2 text-right font-medium">Auditor stake</th>
            <th className="px-2 py-2 text-right font-medium">Spent</th>
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {certs.map((c) => (
            <tr key={c.cert_id}>
              <td className="px-5 py-2.5 sm:px-2">
                <Link
                  href={`/app/near/cert/${c.cert_id}`}
                  className="text-primary font-medium underline"
                >
                  {c.cert_id}
                </Link>
              </td>
              <td
                className="font-address max-w-[16rem] truncate px-2 py-2.5 text-xs"
                title={c.agent}
              >
                {c.agent}
              </td>
              <td className="px-2 py-2.5">
                <NearStatusBadge status={c.status} halted={c.halted} />
              </td>
              <td className="px-2 py-2.5 text-right tabular-nums">
                {formatMusdc(c.bound)}
              </td>
              <td className="px-2 py-2.5 text-right tabular-nums">
                {formatMusdc(c.reserve_locked)}
                <span className="text-muted-foreground">
                  {" "}
                  / {formatMusdc(c.reserve_promised)}
                </span>
              </td>
              <td className="px-2 py-2.5 text-right tabular-nums">
                {formatMusdc(c.allocation)}
              </td>
              <td className="px-2 py-2.5 text-right tabular-nums">
                {formatMusdc(c.spent)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-muted-foreground mt-3 px-5 text-xs sm:px-0">
        Amounts in mock USDC. Spent is gross flow through the meter, not loss.
        Certificates 0 to 2 are left over from discarded early runs and are
        harmless.
      </p>
    </div>
  );
}
