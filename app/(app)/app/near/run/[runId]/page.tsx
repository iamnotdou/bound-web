import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  CircleSlash,
  ShieldX,
  XCircle,
} from "lucide-react";
import { Panel, TxLink } from "@/components/app/near/ui";
import { ACT_TITLES, findRun, type DemoStep } from "@/lib/near/deployment";
import { txStatus, type TxStatus } from "@/lib/near/rpc";
import { cn } from "@/lib/utils";

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
  const acts = [...new Set(run.steps.map((s) => s.act))].sort((a, b) => a - b);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
      <Link
        href="/app/near"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 rounded text-sm transition-colors"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Bound on NEAR
      </Link>

      <header className="mt-6">
        <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">
          Demo run {run.runId} · {run.startedAt.replace("T", " ").slice(0, 19)}{" "}
          UTC
        </p>
        <h1 className="text-foreground mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          {matched} of {withTx.length} recorded transactions match the chain
        </h1>
        <p className="text-muted-foreground mt-3 max-w-3xl text-balance">
          This server asked an archival NEAR node for every hash the run
          recorded and compared success or failure with what the run claimed.
          Expected failures (attacks, a false claim, an early close) count as a
          match when the chain shows them failing. Steps without a hash were
          refused by NEAR before execution: a function-call key that tries a
          deposit, another contract or a transfer never becomes a transaction.
          {unreachable > 0
            ? ` ${unreachable} hash(es) could not be fetched just now; that is no answer, not a mismatch.`
            : ""}{" "}
          Recorded assertions: {run.asserts.filter((a) => a.pass).length}/
          {run.asserts.length} passed.{" "}
          {run.superseded ? (
            <>
              This run used the superseded contract{" "}
              <span className="font-address">{run.contract}</span> (a
              certificate-id aliasing bug, fixed in the current contract), so
              its certificates #{run.certId} and #{run.cert2Id} are not on the
              contract this page reads. Its transactions still check out.
            </>
          ) : (
            <>
              Certificates{" "}
              <Link className="underline" href={`/app/near/cert/${run.certId}`}>
                #{run.certId}
              </Link>{" "}
              (settled) and{" "}
              <Link
                className="underline"
                href={`/app/near/cert/${run.cert2Id}`}
              >
                #{run.cert2Id}
              </Link>{" "}
              (left Verified).
            </>
          )}
        </p>
      </header>

      {acts.map((act) => (
        <Panel
          key={act}
          id={`act-${act}`}
          title={`Act ${act}. ${ACT_TITLES[act] ?? ""}`}
        >
          <ol className="mt-3 space-y-2">
            {run.steps
              .filter((s) => s.act === act)
              .map((s, i) => (
                <StepRow
                  key={`${act}-${i}`}
                  step={s}
                  check={s.hash ? checks.get(s.hash) : undefined}
                />
              ))}
          </ol>
          <AssertList asserts={run.asserts.filter((a) => a.act === act)} />
        </Panel>
      ))}
    </div>
  );
}

function StepRow({ step, check }: { step: DemoStep; check?: TxStatus }) {
  let icon: React.ReactNode;
  let verdict: string;
  if (!step.hash) {
    icon = <ShieldX aria-hidden className="text-primary size-4 shrink-0" />;
    verdict = "refused by NEAR before execution, no transaction exists";
  } else if (!check?.found) {
    icon = (
      <CircleSlash
        aria-hidden
        className="text-muted-foreground size-4 shrink-0"
      />
    );
    verdict = "not fetched just now";
  } else if (check.succeeded === step.ok) {
    icon = (
      <CheckCircle2 aria-hidden className="text-primary size-4 shrink-0" />
    );
    verdict = check.succeeded
      ? "succeeded on chain"
      : "failed on chain, as intended";
  } else {
    icon = <XCircle aria-hidden className="text-destructive size-4 shrink-0" />;
    verdict = `MISMATCH: chain says ${check.succeeded ? "succeeded" : "failed"}`;
  }
  return (
    <li className="flex gap-3 text-sm">
      <span className="mt-0.5">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="text-foreground">{step.label}</span>
        <span className="text-muted-foreground block text-xs">
          <span className="font-address">{step.method}</span> on{" "}
          <span className="font-address">{step.receiver}</span> · {verdict}
          {step.hash ? (
            <>
              {" "}
              · <TxLink hash={step.hash} />
            </>
          ) : null}
        </span>
        {step.error ? (
          <span
            className={cn(
              "font-address mt-1 block break-all text-xs",
              step.expectOk ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {step.error.slice(0, 220)}
          </span>
        ) : null}
      </span>
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
    <div className="bg-muted/40 mt-4 rounded-md p-3">
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        Assertions checked by the run
      </p>
      <ul className="mt-2 space-y-1 text-xs">
        {asserts.map((a, i) => (
          <li key={i} className="flex flex-wrap justify-between gap-2">
            <span>{a.label}</span>
            <span
              className={cn(
                "font-address",
                a.pass ? "text-primary" : "text-destructive",
              )}
            >
              expected {a.expected}, got {a.actual} {a.pass ? "ok" : "FAIL"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
