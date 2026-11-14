import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Braces,
  FileCheck2,
  Gauge,
  KeyRound,
  Landmark,
  Lock,
  Scale,
  ShieldCheck,
  SquareTerminal,
  Timer,
  UserRound,
  Users,
  Plug,
} from "lucide-react";
import { Container, Separator } from "@/components/container";
import { buttonVariants } from "@/components/ui/button";
import { AccountLink, Amount, NearStatusBadge } from "@/components/app/near/ui";
import { getCert, getDeploymentFacts } from "@/lib/near/bound";
import { BOUND_CONTRACT, findRun } from "@/lib/near/deployment";
import { coverage, formatMusdc, type CertView } from "@/lib/near/format";
import {
  NEAR_GITHUB_URL,
  NEAR_RUN_ID,
  NEAR_RUN_PATH,
  NEAR_SNIPPETS,
} from "@/lib/near/links";
import { cn } from "@/lib/utils";

// Same cadence as /app/near: the live numbers are chain facts that are the
// same for every visitor, so a short-lived cached shell is honest.
export const revalidate = 15;

const title =
  "Bound on NEAR: know an agent's worst case before you deal with it";
const description =
  "A surety bond for NEAR agents: a pre-funded reserve, an auditor's slashable stake, and a spend meter the agent's function-call key cannot route around. Live on NEAR testnet, checkable with a view call.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    title,
    description,
    url: "/",
    siteName: "Bound on NEAR",
    type: "website",
  },
  twitter: { card: "summary_large_image", title, description },
};

const RUN = findRun(NEAR_RUN_ID);
const VERIFIED_CERT = RUN?.cert2Id ?? 1;
const VERIFIED_AGENT = RUN?.actors.agent2 ?? "bound-agent2-mwfnc6q8.testnet";
const RUN_TXS = RUN ? RUN.steps.filter((s) => s.hash).length : 37;
const RUN_ASSERTS = RUN ? RUN.asserts.length : 36;

export default async function NearHome() {
  const [facts, cert] = await Promise.all([
    getDeploymentFacts(),
    getCert(VERIFIED_CERT),
  ]);
  const view = cert.ok ? cert.value : null;
  const bound = facts.contracts.find((c) => c.accountId === BOUND_CONTRACT);

  return (
    <div className="bg-foreground/3 overflow-x-clip">
      <Hero />
      <Problem />
      <HowItWorks />
      <WhyNear />
      <Live
        certId={VERIFIED_CERT}
        agent={VERIFIED_AGENT}
        view={view}
        readFailed={!cert.ok}
        certCount={facts.certCount}
      />
      <Developers />
      <Proof codeHashMatches={bound?.matches ?? null} />
      <TrustModel />
      <Cta />
    </div>
  );
}

/* ---------------------------------------------------------------- shared */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">
      {children}
    </p>
  );
}

function SectionHead({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div data-grid-content className="p-6 lg:p-12">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="text-foreground mt-3 text-balance text-3xl font-semibold tracking-tight lg:text-4xl">
        {title}
      </h2>
      {children ? (
        <div className="text-muted-foreground mt-4 max-w-3xl text-balance">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function Cell({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div data-grid-content className="space-y-3 p-6 lg:p-8">
        <h3 className="text-foreground flex items-center gap-2 font-medium">
          {Icon ? <Icon aria-hidden className="text-primary size-4" /> : null}
          {title}
        </h3>
        <div className="text-muted-foreground text-sm leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="bg-background ring-foreground/10 font-address mt-3 max-w-full whitespace-pre-wrap rounded-md p-3 text-xs leading-relaxed ring-1 [overflow-wrap:anywhere]">
      <code>{children}</code>
    </pre>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return <code className="font-address text-foreground">{children}</code>;
}

/* ------------------------------------------------------------- sections */

function Hero() {
  return (
    <section aria-labelledby="hero-heading">
      <Separator className="h-6" />
      <Container>
        <div className="px-6 py-14 text-center sm:py-20 lg:px-12">
          <Eyebrow>NEAR testnet · built at NEAR HACKATHON</Eyebrow>
          <h1
            id="hero-heading"
            className="text-foreground mx-auto mt-4 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl"
          >
            Know a NEAR agent&apos;s worst case before you deal with it
          </h1>
          <p className="text-muted-foreground mx-auto mb-9 mt-5 max-w-2xl text-balance text-lg">
            Bound is a surety bond for AI agents. It replaces &ldquo;can I trust
            this agent?&rdquo; with a number anyone can look up: a pre-funded
            reserve plus an auditor&apos;s slashable stake, behind an agent
            account whose only key can call nothing but a metered{" "}
            <Mono>pay</Mono>.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              className={cn(buttonVariants({ size: "lg" }), "text-sm")}
              href={`/app/near?agent=${VERIFIED_AGENT}`}
            >
              Verify an agent
              <ArrowRight aria-hidden />
            </Link>
            <Link
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "text-sm",
              )}
              href="/docs"
            >
              Read the docs
            </Link>
            <Link
              className={cn(
                buttonVariants({ size: "lg", variant: "ghost" }),
                "text-sm",
              )}
              href="/deck"
            >
              See the deck
            </Link>
          </div>
          <p className="text-muted-foreground mt-4 text-sm">
            Read-only, no wallet needed. Every live figure on this page is a
            view call made when it rendered.
          </p>
        </div>
      </Container>
    </section>
  );
}

function Problem() {
  return (
    <section aria-labelledby="problem-heading">
      <Separator className="h-6" />
      <Container asGrid>
        <div id="problem-heading">
          <SectionHead
            eyebrow="The problem"
            title="An agent with a key is an unpriced risk"
          />
        </div>
        <div className="grid gap-px md:grid-cols-3">
          <Cell icon={Users} title="Counterparties are asked to trust">
            A service that sells to an agent, or extends it credit, has nothing
            to check. &ldquo;My agent is safe&rdquo; cannot be sized and cannot
            be recovered against.
          </Cell>
          <Cell icon={KeyRound} title="Keys do whatever they can">
            A prompt-injected or buggy agent spends what its key allows. With a
            full-access key, that is everything on the account.
          </Cell>
          <Cell icon={Scale} title="Losses have nowhere to land">
            When harm happens there is no money set aside for it and no rule for
            who is paid first. Each dispute starts from zero.
          </Cell>
        </div>
      </Container>
    </section>
  );
}

const PARTS = [
  {
    icon: UserRound,
    title: "Operator",
    body: "Publishes a certificate for its agent naming a bound, a reserve, a float cap, an allowlist of recipients and an expiry, then funds it.",
  },
  {
    icon: KeyRound,
    title: "Agent",
    body: "Accepts the certificate once, then swaps its full-access key for a function-call key that can only call pay on the Bound contract.",
  },
  {
    icon: Landmark,
    title: "Auditor",
    body: "Attests the certificate by locking part of its own stake behind it, and earns the premium for doing so.",
  },
  {
    icon: Lock,
    title: "Reserve",
    body: "Pre-funded by the operator and locked in the contract. Arbitrated victims are paid from it first.",
  },
  {
    icon: ShieldCheck,
    title: "Slashable stake",
    body: "The auditor's allocation tops up what the reserve could not cover. Coverage is reserve plus allocation.",
  },
  {
    icon: Gauge,
    title: "Spend meter",
    body: "Every pay is counted against the bound and the float, and only allowlisted recipients can be paid. Bound is a meter, not a guarantee.",
  },
  {
    icon: Timer,
    title: "Claim window",
    body: "Once a harm claim is resolved, a window opens. Payments freeze until anyone closes it, then the certificate settles.",
  },
] as const;

function HowItWorks() {
  return (
    <section aria-labelledby="how-heading">
      <Separator className="h-6" />
      <Container asGrid>
        <div id="how-heading">
          <SectionHead
            eyebrow="How it works"
            title="Three parties, one certificate, a fixed waterfall"
          >
            One NEAR contract holds the money and the rules. The arithmetic
            fraud proofs are checked by the contract itself; a harm claim is
            decided by a disclosed arbiter.
          </SectionHead>
        </div>
        <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-4">
          {PARTS.map((p) => (
            <Cell key={p.title} icon={p.icon} title={p.title}>
              {p.body}
            </Cell>
          ))}
          <div className="min-w-0">
            <div data-grid-content className="space-y-3 p-6 lg:p-8">
              <h3 className="text-foreground flex items-center gap-2 font-medium">
                <FileCheck2 aria-hidden className="text-primary size-4" />
                Settlement waterfall
              </h3>
              <p className="text-foreground font-address text-2xl tabular-nums">
                120 = 100 + 20
              </p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Run {NEAR_RUN_ID}: a 120 mUSDC harm was paid in full, 100 from
                the reserve and 20 slashed from the auditor. The auditor&apos;s
                other 180 was not touched.
              </p>
              <Link
                href={NEAR_RUN_PATH}
                className="text-primary inline-flex items-center gap-1 text-sm font-medium underline"
              >
                See the run
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function WhyNear() {
  return (
    <section aria-labelledby="near-heading">
      <Separator className="h-6" />
      <Container asGrid>
        <div id="near-heading">
          <SectionHead
            eyebrow="Why NEAR"
            title="The account model does half the enforcement"
          >
            On NEAR the confinement is a property of the agent&apos;s account,
            not a promise in its code, and anyone can read it.
          </SectionHead>
        </div>
        <div className="grid gap-px sm:grid-cols-2">
          <Cell icon={KeyRound} title="A function-call key limited to pay">
            The agent&apos;s only access key is scoped to the Bound contract and
            the single method <Mono>pay</Mono>, with a gas-only allowance. It
            cannot transfer tokens, mint, withdraw or send NEAR; the run shows
            each attempt refused.
          </Cell>
          <Cell icon={BadgeCheck} title="Named accounts">
            Certificates, allowlists and settlements name accounts like{" "}
            <Mono>bound-agent2-mwfnc6q8.testnet</Mono>, so a counterparty can
            read who it is dealing with, not a key hash.
          </Cell>
          <Cell icon={SquareTerminal} title="View calls anyone can make">
            <Mono>verify</Mono>, <Mono>get_cert</Mono> and the agent&apos;s
            access-key list are free RPC reads. No wallet, no signature, no
            indexer.
          </Cell>
          <Cell icon={ShieldCheck} title="No code on the agent">
            The agent account carries no contract code and no global contract
            (its code hash is all ones), so nothing on it can add a key or move
            funds around the meter.
          </Cell>
        </div>
      </Container>
    </section>
  );
}

function Live({
  certId,
  agent,
  view,
  readFailed,
  certCount,
}: {
  certId: number;
  agent: string;
  view: CertView | null;
  readFailed: boolean;
  certCount: number | null;
}) {
  const cov = view ? coverage(view) : null;
  return (
    <section aria-labelledby="live-heading">
      <Separator className="h-6" />
      <Container asGrid>
        <div id="live-heading">
          <SectionHead
            eyebrow="Live on testnet"
            title="Read from the chain, just now"
          >
            These numbers come from{" "}
            <AccountLink id={BOUND_CONTRACT} className="text-foreground" /> when
            this page rendered. A failed read says so; it never turns into a
            zero.
          </SectionHead>
        </div>
        <div className="grid gap-px md:grid-cols-3">
          <div className="min-w-0">
            <div data-grid-content className="space-y-2 p-6 lg:p-8">
              <p className="text-muted-foreground text-sm">
                Coverage of certificate #{certId}
              </p>
              {readFailed ? (
                <p className="text-foreground text-sm">
                  Could not be read just now; reload.
                </p>
              ) : view && cov ? (
                <>
                  <p className="text-foreground text-3xl font-semibold">
                    <Amount value={formatMusdc(cov.victimCover)} />
                  </p>
                  <p className="text-muted-foreground text-xs">
                    reserve <Amount value={formatMusdc(view.reserve_locked)} />{" "}
                    + auditor stake{" "}
                    <Amount value={formatMusdc(view.allocation)} />
                    , bound <Amount value={formatMusdc(view.bound)} />
                  </p>
                </>
              ) : (
                <p className="text-foreground text-sm">
                  No certificate #{certId} on the contract.
                </p>
              )}
            </div>
          </div>
          <div className="min-w-0">
            <div data-grid-content className="space-y-2 p-6 lg:p-8">
              <p className="text-muted-foreground text-sm">Status</p>
              {view ? (
                <p>
                  <NearStatusBadge status={view.status} halted={view.halted} />
                </p>
              ) : (
                <p className="text-foreground text-sm">unreadable</p>
              )}
              <p className="text-muted-foreground text-xs [overflow-wrap:anywhere]">
                agent <span className="font-address">{agent}</span>
              </p>
            </div>
          </div>
          <div className="min-w-0">
            <div data-grid-content className="space-y-2 p-6 lg:p-8">
              <p className="text-muted-foreground text-sm">
                Certificates on the contract
              </p>
              <p className="text-foreground text-3xl font-semibold tabular-nums">
                {certCount ?? "unreadable"}
              </p>
              <Link
                href={`/app/near?agent=${agent}`}
                className="text-primary inline-flex items-center gap-1 text-sm font-medium underline"
              >
                Verify this agent
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function Developers() {
  return (
    <section aria-labelledby="dev-heading">
      <Separator className="h-6" />
      <Container asGrid>
        <div id="dev-heading">
          <SectionHead
            eyebrow="For developers"
            title="Check a certificate before you serve an agent"
          >
            The <Mono>@bound/near</Mono> package is a typed client for the
            contract, a command line and an MCP server, so a service, a script
            or an LLM agent can ask the same question this site asks.
          </SectionHead>
        </div>
        <div className="grid gap-px md:grid-cols-3">
          <Cell icon={Braces} title="SDK">
            A typed client for the contract, for your service or script.
            <Code>{NEAR_SNIPPETS.install}</Code>
          </Cell>
          <Cell icon={SquareTerminal} title="CLI">
            The same answer from a terminal.
            <Code>{NEAR_SNIPPETS.verify}</Code>
          </Cell>
          <Cell icon={Plug} title="MCP server">
            Read tools need nothing; <Mono>near_pay</Mono> needs the
            agent&apos;s function-call key.
            <Code>{NEAR_SNIPPETS.mcp}</Code>
          </Cell>
        </div>
        <div
          data-grid-content
          className="flex flex-wrap items-center gap-3 p-6 lg:px-12"
        >
          <span className="text-muted-foreground text-sm">
            Or over HTTP: <Mono>{NEAR_SNIPPETS.http}</Mono>
          </span>
          <Link
            href="/docs"
            className="text-primary ml-auto inline-flex items-center gap-1 text-sm font-medium underline"
          >
            Docs
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      </Container>
    </section>
  );
}

function Proof({ codeHashMatches }: { codeHashMatches: boolean | null }) {
  return (
    <section aria-labelledby="proof-heading">
      <Separator className="h-6" />
      <Container asGrid>
        <div id="proof-heading">
          <SectionHead eyebrow="Proof" title="Checked, not trusted" />
        </div>
        <div className="grid gap-px md:grid-cols-3">
          <Cell icon={FileCheck2} title="Code hash matches the build">
            {codeHashMatches === null ? (
              <>The contract&apos;s code hash could not be read just now.</>
            ) : codeHashMatches ? (
              <>
                The on-chain code hash of <Mono>{BOUND_CONTRACT}</Mono>{" "}
                <span className="text-primary font-medium">matches</span> the
                wasm built from the tagged commit, read live.
              </>
            ) : (
              <>
                The on-chain code hash{" "}
                <span className="text-destructive font-medium">
                  does not match
                </span>{" "}
                the recorded build. Treat this deployment as changed.
              </>
            )}
          </Cell>
          <Cell
            icon={ShieldCheck}
            title={`${RUN_TXS} of ${RUN_TXS} recorded transactions`}
          >
            Run {NEAR_RUN_ID} recorded {RUN_TXS} transactions and {RUN_ASSERTS}{" "}
            assertions, all passing. Its page asks an archival node for the
            status of every hash when it loads.
          </Cell>
          <Cell icon={ArrowRight} title="Open the run">
            Every step, signer, method and refusal, with links to NearBlocks.
            <Link
              href={NEAR_RUN_PATH}
              className="text-primary mt-3 flex items-center gap-1 font-medium underline"
            >
              Run {NEAR_RUN_ID}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </Cell>
        </div>
      </Container>
    </section>
  );
}

function TrustModel() {
  return (
    <section aria-labelledby="trust-heading">
      <Separator className="h-6" />
      <Container asGrid>
        <div id="trust-heading">
          <SectionHead
            eyebrow="Trust model"
            title="What this deploy does not claim"
          >
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
              <li>
                It runs on NEAR testnet with a test token. Nothing here is real
                money.
              </li>
              <li>
                The arbiter, the treasury and the contract&apos;s full-access
                key are held by the author. A harm claim is decided by that one
                arbiter account, disclosed on every certificate.
              </li>
              <li>
                Because the contract account keeps its deployer key, its code
                could be replaced. The code-hash check above is how you see that
                it has not been.
              </li>
              <li>
                The demo auditor is ours too. A certificate proves committed
                capital, not good behaviour.
              </li>
            </ul>
          </SectionHead>
        </div>
      </Container>
    </section>
  );
}

function Cta() {
  return (
    <section aria-labelledby="cta-heading">
      <Separator className="h-6" />
      <Container>
        <div className="px-6 py-14 text-center lg:px-12">
          <h2
            id="cta-heading"
            className="text-foreground text-balance text-3xl font-semibold lg:text-4xl"
          >
            Look up an agent before it pays you
          </h2>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              className={cn(buttonVariants({ size: "lg" }), "text-sm")}
              href="/app/near"
            >
              Open the app
            </Link>
            <Link
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "text-sm",
              )}
              href="/docs"
            >
              Docs
            </Link>
            <a
              className={cn(
                buttonVariants({ size: "lg", variant: "ghost" }),
                "text-sm",
              )}
              href={NEAR_GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Source on GitHub
            </a>
          </div>
        </div>
      </Container>
      <Separator className="h-12" />
    </section>
  );
}
