import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { clsx } from "clsx";
// Fundations
import { GradientHero } from "@/components/navy/gradient-hero";
import { Section } from "@/components/navy/section";
import { grid, mainCol, mainStart } from "@/components/navy/grid";
import { Text } from "@/components/navy/text";
import { Wrapper } from "@/components/navy/wrapper";
// Components
import { SectionHead, TxLink } from "@/components/near/app/ui";
import { Stats } from "@/components/near/app/stats";
// Content
import {
  ACT_TITLES,
  findRun,
  supersededReason,
  type DemoStep,
} from "@/lib/near/deployment";
import { txStatus, type TxStatus } from "@/lib/near/rpc";

// Rendered per request, never at build time: a build that hit a busy RPC
// node would otherwise serve "could not be fetched" for an hour. Final
// statuses are memoized in lib/near/rpc.ts, so a reload costs only the
// lookups that got no answer before.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/app/near/run/[runId]">): Promise<Metadata> {
  const { runId } = await params;
  return { title: `NEAR demo run ${runId}` };
}

/** Bounded concurrency so one page load is not 40 parallel RPC calls. */
async function checkAll(steps: DemoStep[]): Promise<Map<string, TxStatus>> {
  const out = new Map<string, TxStatus>();
  const todo = steps.filter((s) => s.hash);
  for (let i = 0; i < todo.length; i += 6) {
    const batch = await Promise.all(
      todo.slice(i, i + 6).map((s) => txStatus(s.hash!, s.signer)),
    );
    for (const r of batch) out.set(r.hash, r);
  }
  return out;
}

const backLink =
  "text-inverse-foreground/70 hover:text-inverse-foreground focus-visible:ring-primary/30 rounded-sm text-sm transition-colors focus-visible:ring-3 focus-visible:outline-none";
const inlineLink =
  "text-foreground rounded-sm underline decoration-1 underline-offset-4 transition-colors focus-visible:ring-3 focus-visible:ring-primary/30 focus-visible:outline-none";

export default async function NearRunPage({
  params,
}: PageProps<"/app/near/run/[runId]">) {
  const { runId } = await params;
  const run = findRun(runId);
  if (!run) notFound();
  const checks = await checkAll(run.steps);

  const withTx = run.steps.filter((s) => s.hash);
  const matched = withTx.filter(
    (s) => checks.get(s.hash!)?.succeeded === s.ok,
  ).length;
  const unreachable = withTx.filter((s) => !checks.get(s.hash!)?.found).length;
  const refused = run.steps.length - withTx.length;
  const passed = run.asserts.filter((a) => a.pass).length;
  const acts = [...new Set(run.steps.map((s) => s.act))].sort((a, b) => a - b);

  return (
    <>
      <GradientHero labelledBy="run-heading">
        <Link href="/app/near" className={backLink}>
          Bound on NEAR
        </Link>
        <Text
          tag="p"
          variant="textXS"
          className="text-inverse-foreground/70 mt-10 uppercase"
        >
          Demo run {run.runId} · {run.startedAt.replace("T", " ").slice(0, 19)}{" "}
          UTC
        </Text>
        <Text
          tag="h1"
          id="run-heading"
          variant="displayLG"
          className="text-inverse-foreground mt-6 max-w-3xl tracking-tight text-balance"
        >
          {matched} of {withTx.length} recorded transactions match the{" "}
          <em>chain</em>
        </Text>
      </GradientHero>

      <section aria-label="How the run was checked">
        <Wrapper className={clsx("grid pt-24", grid)}>
          <div className={clsx("min-w-0", mainCol, mainStart)}>
            <Text
              tag="p"
              variant="textBase"
              className="text-muted-foreground max-w-2xl text-pretty"
            >
              This server asked an archival NEAR node for every hash the run
              recorded and compared success or failure with what the run
              claimed. Expected failures (attacks, a false claim, an early
              close) count as a match when the chain shows them failing. Steps
              without a hash were refused by NEAR before execution: a
              function-call key that tries a deposit, another contract or a
              transfer never becomes a transaction.
              {unreachable > 0
                ? ` ${unreachable} hash(es) could not be fetched just now; that is no answer, not a mismatch.`
                : ""}{" "}
              Recorded assertions: {passed}/{run.asserts.length} passed.{" "}
              {run.superseded ? (
                <>
                  This run used the superseded contract{" "}
                  <span className="text-foreground break-all">
                    {run.contract}
                  </span>{" "}
                  ({supersededReason(run)}), so its certificates #{run.certId}{" "}
                  and #{run.cert2Id} are not on the contract this page reads.
                  Its transactions still check out.
                </>
              ) : (
                <>
                  Certificates{" "}
                  <Link
                    className={inlineLink}
                    href={`/app/near/cert/${run.certId}`}
                  >
                    #{run.certId}
                  </Link>{" "}
                  (settled) and{" "}
                  <Link
                    className={inlineLink}
                    href={`/app/near/cert/${run.cert2Id}`}
                  >
                    #{run.cert2Id}
                  </Link>{" "}
                  (left Verified).
                </>
              )}
            </Text>
          </div>
        </Wrapper>
      </section>

      <Section
        label="Summary"
        aria-label="Summary"
        full={
          <Stats
            stats={[
              {
                value: String(matched),
                unit: `/${withTx.length}`,
                label: "Recorded transactions match the chain",
              },
              {
                value: String(refused),
                label: "Steps refused by NEAR before execution",
                text: "No transaction exists for these.",
              },
              {
                value: String(passed),
                unit: `/${run.asserts.length}`,
                label: "Recorded assertions passed",
              },
              {
                value: String(unreachable),
                label: "Hashes not fetched just now",
                text: "That is no answer, not a mismatch.",
              },
            ]}
          />
        }
      />

      {acts.map((act, i) => (
        <Section
          key={act}
          label={`Act ${act}`}
          aria-labelledby={`act-${act}`}
          wrapperClassName={i === acts.length - 1 ? "pb-32" : "pb-24"}
        >
          <SectionHead
            id={`act-${act}`}
            title={`Act ${act}. ${ACT_TITLES[act] ?? ""}`}
          />
          <ol className="border-border mt-10 flex flex-col border-b">
            {run.steps
              .filter((s) => s.act === act)
              .map((s, j) => (
                <StepRow
                  key={`${act}-${j}`}
                  step={s}
                  check={s.hash ? checks.get(s.hash) : undefined}
                />
              ))}
          </ol>
          <AssertList asserts={run.asserts.filter((a) => a.act === act)} />
        </Section>
      ))}
    </>
  );
}

type Verdict = { label: string; text: string; tone: string };

function verdictOf(step: DemoStep, check?: TxStatus): Verdict {
  if (!step.hash)
    return {
      label: "Refused",
      text: "refused by NEAR before execution, no transaction exists",
      tone: "text-primary",
    };
  if (!check?.found)
    return {
      label: "Not fetched",
      text: "not fetched just now",
      tone: "text-muted-foreground",
    };
  if (check.succeeded === step.ok)
    return {
      label: "Match",
      text: check.succeeded
        ? "succeeded on chain"
        : "failed on chain, as intended",
      tone: "text-primary",
    };
  return {
    label: "Mismatch",
    text: `MISMATCH: chain says ${check.succeeded ? "succeeded" : "failed"}`,
    tone: "text-foreground",
  };
}

function StepRow({ step, check }: { step: DemoStep; check?: TxStatus }) {
  const v = verdictOf(step, check);
  return (
    <li className="border-border grid gap-2 border-t py-5 sm:grid-cols-4 sm:gap-8">
      <Text
        tag="span"
        variant="textXS"
        className={clsx("font-medium uppercase sm:pt-0.5", v.tone)}
      >
        {v.label}
      </Text>
      <div className="min-w-0 sm:col-span-3">
        <Text tag="p" variant="textSM" className="text-foreground font-medium">
          {step.label}
        </Text>
        <Text
          tag="p"
          variant="textSM"
          className="text-muted-foreground mt-1 wrap-anywhere"
        >
          {step.method} on {step.receiver} · {v.text}
        </Text>
        {step.hash ? (
          <div className="mt-2">
            <TxLink hash={step.hash} />
          </div>
        ) : null}
        {step.error ? (
          <Text
            tag="p"
            variant="textXS"
            className={clsx(
              "mt-2 wrap-anywhere",
              step.expectOk ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {step.error.slice(0, 220)}
          </Text>
        ) : null}
      </div>
    </li>
  );
}

function AssertList({
  asserts,
}: {
  asserts: Array<{
    label: string;
    expected: string;
    actual: string;
    pass: boolean;
  }>;
}) {
  if (asserts.length === 0) return null;
  return (
    <div className="mt-12">
      <Text tag="h3" variant="textSM" className="text-muted-foreground">
        Assertions checked by the run
      </Text>
      <ul className="border-border mt-4 border-t">
        {asserts.map((a, i) => (
          <li
            key={i}
            className="border-border flex flex-col gap-1 border-b py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
          >
            <Text tag="span" variant="textSM" className="text-foreground">
              {a.label}
            </Text>
            <Text
              tag="span"
              variant="textSM"
              className={clsx(
                "min-w-0 wrap-anywhere",
                a.pass
                  ? "text-muted-foreground"
                  : "text-foreground font-medium",
              )}
            >
              expected {a.expected}, got {a.actual}{" "}
              <span
                className={clsx(
                  "text-xs uppercase",
                  a.pass ? "text-primary" : "text-foreground",
                )}
              >
                {a.pass ? "ok" : "FAIL"}
              </span>
            </Text>
          </li>
        ))}
      </ul>
    </div>
  );
}
