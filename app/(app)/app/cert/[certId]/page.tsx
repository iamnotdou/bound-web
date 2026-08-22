import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info, Snowflake, ShieldAlert } from "lucide-react";
import { Address } from "@/components/app/address";
import { ArchivedNotice } from "@/components/app/archived-notice";
import { AttestPanel } from "@/components/app/attest-panel";
import { ChallengeCertificate } from "@/components/app/challenge-certificate";
import { DemoAuditorNote } from "@/components/app/demo-auditor-note";
import { ReservePanel } from "@/components/app/reserve-panel";
import { StatusBadge } from "@/components/app/status-badge";
import { formatExpiry, relativeFromNow } from "@/components/app/relative-time";
import { formatUsdcExact } from "@/components/app/usdc";
import { CoveragePanel } from "@/components/app/coverage-panel";
import { SpendMeterPanel } from "@/components/app/spend-meter";
import {
  getCertificateActivity,
  getCertificateFacts,
  isKnownCertId,
} from "@/lib/bound";
import {
  deriveCertState,
  LIFECYCLE_SUMMARY,
  type CertState,
} from "@/lib/cert-state";
import { nowUnix } from "@/lib/clock";
import { cn } from "@/lib/utils";

// Chain state, not build-time content. A stale "Verified" is the one claim
// this page must never make.
export const revalidate = 30;

function parseCertId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/app/cert/[certId]">): Promise<Metadata> {
  const { certId } = await params;
  const parsed = parseCertId(certId);
  const facts = parsed === null ? null : await getCertificateFacts(parsed);

  if (!facts) return { title: "Certificate not found" };

  const state = deriveCertState(facts, nowUnix());
  const vault =
    facts.reserve.vaultStroops === null
      ? "an unreadable reserve"
      : `${formatUsdcExact(facts.reserve.vaultStroops)} actually held in the vault`;

  return {
    title: `Certificate #${facts.cert.certId}`,
    description: `${state.lifecycle} certificate bounding losses at ${facts.cert.boundUsd}, claiming ${facts.cert.reserveUsd} of reserve with ${vault}.`,
  };
}

export default async function CertificatePage({
  params,
}: PageProps<"/app/cert/[certId]">) {
  const { certId } = await params;
  const parsed = parseCertId(certId);
  const facts = parsed === null ? null : await getCertificateFacts(parsed);

  if (!facts) {
    // "Never issued" and "issued, then reclaimed by state archival" are
    // different answers and only one of them is a 404. The certificate count
    // is a separate ledger entry, so it can tell them apart.
    if (parsed !== null && (await isKnownCertId(parsed))) {
      return (
        <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
          <ArchivedNotice certId={parsed} />
        </div>
      );
    }
    notFound();
  }

  const now = nowUnix();
  const state = deriveCertState(facts, now);
  const cert = facts.cert;
  const expired = now > cert.expiresAtUnix;
  const { meter, coverage } = await getCertificateActivity(
    cert.certId,
    cert.agent,
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
      <Link
        href="/app"
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 rounded text-sm transition-colors focus-visible:outline-none focus-visible:ring-2"
      >
        <ArrowLeft aria-hidden className="size-4" />
        All bonded agents
      </Link>

      <header className="mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-muted-foreground font-mono text-xs uppercase tracking-widest">
            Certificate #{cert.certId}
          </span>
          <StatusBadge status={cert.status} expired={expired} />
        </div>
        <h1 className="text-foreground mt-3 break-all text-2xl font-semibold tracking-tight sm:text-3xl">
          <span className="font-address">{cert.agent}</span>
        </h1>
        <p
          className={cn(
            "mt-3 text-balance",
            state.lifecycle === "verified"
              ? "text-foreground"
              : "text-muted-foreground",
          )}
        >
          {LIFECYCLE_SUMMARY[state.lifecycle]}
        </p>
      </header>

      {state.lifecycle === "frozen" ? <FrozenNotice facts={facts} /> : null}

      {facts.archived ? (
        <div className="mt-6">
          <ArchivedNotice
            certId={cert.certId}
            detail="The certificate's own record read back, but one of the contracts holding its capital did not answer with a live figure."
          />
        </div>
      ) : null}

      <h2 className="text-foreground mt-10 text-lg font-semibold">
        Capital committed
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <CapitalCard
          label="Bound"
          value={cert.boundUsd}
          caption="The ceiling. The maximum loss this certificate covers."
          emphasis
        />
        <CapitalCard
          label="Reserve"
          value={
            facts.reserve.vaultStroops === null
              ? "Unreadable"
              : formatUsdcExact(facts.reserve.vaultStroops)
          }
          caption={reserveCaption(facts.reserve, state)}
        />
        <CapitalCard
          label="Auditor stake"
          value={
            facts.allocation.liveStroops === null
              ? cert.auditorStakeUsd
              : formatUsdcExact(facts.allocation.liveStroops)
          }
          caption={allocationCaption(facts.allocation, state, cert.auditor)}
        />
      </div>
      <p className="text-muted-foreground mt-3 text-sm">
        The reserve and the auditor stake above are read live from the vault and
        the staking contract, not taken from the certificate&apos;s own record.
        The bound is the only one of the three that is a promise rather than a
        balance.
      </p>

      <ReservePanel facts={facts} state={state} />

      <AttestPanel facts={facts} state={state} />

      <h2 className="text-foreground mt-10 text-lg font-semibold">
        Certificate details
      </h2>
      <dl className="ring-foreground/6.5 bg-card divide-border mt-4 divide-y rounded-xl shadow ring-1">
        <Row label="Certificate ID">
          <span className="font-address text-sm">#{cert.certId}</span>
        </Row>
        <Row label="Agent">
          <Address value={cert.agent} edge={10} />
        </Row>
        <Row label="Operator">
          {facts.operator ? (
            <Address value={facts.operator} edge={10} />
          ) : (
            <span className="text-muted-foreground text-sm">
              The registry did not return an operator
            </span>
          )}
        </Row>
        <Row label="Status">
          <StatusBadge status={cert.status} expired={expired} />
        </Row>
        <Row label="Auditor">
          {cert.auditor ? (
            <span className="inline-flex flex-wrap items-center justify-end gap-2">
              <Address value={cert.auditor} edge={10} />
              {state.demoAuditor ? <DemoAuditorNote compact /> : null}
            </span>
          ) : (
            <span className="text-muted-foreground text-sm">
              No auditor has attested yet
            </span>
          )}
        </Row>
        <Row label="Expires">
          <span
            className={cn("text-sm", expired && "text-destructive font-medium")}
          >
            {formatExpiry(cert.expiresAtIso)}{" "}
            <span className="text-muted-foreground font-normal">
              ({relativeFromNow(cert.expiresAtUnix)})
            </span>
          </span>
        </Row>
        <Row label="Settlement deadline">
          {facts.freeze?.settlementDeadlineUnix ? (
            <span className="text-sm">
              {formatExpiry(
                new Date(
                  facts.freeze.settlementDeadlineUnix * 1000,
                ).toISOString(),
              )}{" "}
              <span className="text-muted-foreground font-normal">
                (a claim can still land until then)
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground text-sm">
              The registry did not return one
            </span>
          )}
        </Row>
        <Row label="On-chain record">
          <span className="text-muted-foreground text-sm">
            {cert.hasCert ? "Certificate present" : "No certificate issued"}
          </span>
        </Row>
      </dl>

      <SpendMeterPanel meter={meter} certId={cert.certId} />

      <CoveragePanel coverage={coverage} status={cert.status} />

      <ChallengeCertificate certId={cert.certId} />

      <Guarantees state={state} status={cert.status} />
    </div>
  );
}

function reserveCaption(
  reserve: { claimedStroops: string; vaultStroops: string | null },
  state: CertState,
): string {
  if (reserve.vaultStroops === null) {
    return `The vault did not answer. The certificate claims ${formatUsdcExact(reserve.claimedStroops)}; whether that is held is unknown.`;
  }
  if (state.reserveShortfallStroops === "0") {
    return `Held by the reserve vault, matching the ${formatUsdcExact(reserve.claimedStroops)} this certificate claims.`;
  }
  return `Held by the reserve vault. The certificate claims ${formatUsdcExact(reserve.claimedStroops)} — it is short by ${formatUsdcExact(state.reserveShortfallStroops ?? "0")}.`;
}

function allocationCaption(
  allocation: { snapshotStroops: string; liveStroops: string | null },
  state: CertState,
  auditor: string | null,
): string {
  if (auditor === null) {
    return "No auditor has bonded capital to this certificate, so nothing third-party stands behind it.";
  }
  if (allocation.liveStroops === null) {
    return `The staking contract did not answer. The certificate records ${formatUsdcExact(allocation.snapshotStroops)} as the allocation at attest time.`;
  }
  if (state.allocationSlashed) {
    return `Live allocation, below the ${formatUsdcExact(allocation.snapshotStroops)} recorded at attest time — capital has left this certificate.`;
  }
  return `Slashable capital the auditor allocated to this certificate, still standing behind it.`;
}

function FrozenNotice({
  facts,
}: {
  facts: NonNullable<Awaited<ReturnType<typeof getCertificateFacts>>>;
}) {
  const closes = facts.freeze?.claimFreezeUnix;
  return (
    <div
      role="status"
      className="ring-foreground/10 bg-muted/40 mt-6 rounded-xl p-5 ring-1"
    >
      <h2 className="text-foreground flex items-center gap-2 text-sm font-semibold">
        <Snowflake aria-hidden className="size-4" />A claim window is open
        against this certificate
      </h2>
      <p className="text-muted-foreground mt-2 text-sm text-balance">
        Somebody has filed a challenge. The window stays open so other claimants
        can file against the same certificate and be paid together rather than
        first-come; nothing settles until it closes and someone calls
        `close_window`, which is permissionless and which this app holds no key
        to do.
        {closes
          ? ` It can be closed from ${new Date(closes * 1000).toUTCString()}.`
          : ""}
      </p>
    </div>
  );
}

function Guarantees({
  state,
  status,
}: {
  state: CertState;
  status: "Pending" | "Verified" | "Invalid";
}) {
  return (
    <section
      aria-labelledby="guarantees-heading"
      className="ring-foreground/6.5 bg-card mt-10 rounded-xl p-6 shadow ring-1"
    >
      <h2
        id="guarantees-heading"
        className="text-foreground flex items-center gap-2 text-lg font-semibold"
      >
        <ShieldAlert aria-hidden className="text-primary size-5" />
        What this does and does not guarantee
      </h2>

      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="text-foreground flex items-center gap-2 text-sm font-medium">
            <Info aria-hidden className="text-primary size-4" />
            What it proves
          </h3>
          {/* What a certificate proves depends on what has actually happened to
              it, so this keys off the derived lifecycle rather than off the
              recorded status. A Verified record whose vault has been drained is
              not proof that capital is committed. */}
          {state.lifecycle === "verified" ? (
            <ul className="text-muted-foreground mt-2 space-y-2 text-sm">
              <li>
                Capital is committed on-chain up to the bound shown above.
              </li>
              <li>
                The reserve vault holds what the certificate claims — read live,
                not taken from the record.
              </li>
              <li>
                A named third-party auditor bonded slashable capital to this
                certificate.
              </li>
              <li>Anyone can verify all of the above independently.</li>
            </ul>
          ) : (
            <ul className="text-muted-foreground mt-2 space-y-2 text-sm">
              <li>{LIFECYCLE_SUMMARY[state.lifecycle]}</li>
              <li>
                The bound above is a{" "}
                <strong className="text-foreground">claimed number</strong>{" "}
                recorded on-chain, not capital proven to be committed.
              </li>
              <li>
                {state.lifecycle === "pending-funded"
                  ? "The reserve is funded, but no auditor has bonded capital to it yet — and an unattested certificate is not cover."
                  : state.lifecycle === "pending-partial" ||
                      state.lifecycle === "pending-unfunded"
                    ? "No auditor has bonded capital to this certificate, and an auditor cannot attest one whose reserve is not funded."
                    : status === "Verified"
                      ? "Whatever backed it once does not back it now."
                      : "This certificate is not currently valid."}
              </li>
              <li>
                Anyone can verify that for themselves — which is the only thing
                this record guarantees today.
              </li>
            </ul>
          )}
          {state.allocationSlashed ? (
            <p className="text-destructive mt-3 text-sm">
              The auditor&apos;s live allocation is below the figure recorded
              when they attested. Capital has left this certificate since.
            </p>
          ) : null}
        </div>

        <div>
          <h3 className="text-foreground text-sm font-medium">
            What it does not prove
          </h3>
          <ul className="text-muted-foreground mt-2 space-y-2 text-sm">
            <li>
              It does <strong className="text-foreground">not</strong> prove the
              agent will behave, perform well, or act in your interest.
            </li>
            <li>
              It does not certify the agent&apos;s code, model, or operator.
            </li>
            <li>
              It does not cover losses above the bound, or any loss once the
              certificate expires.
            </li>
            <li>
              A verified certificate bounds your worst case. It is not an
              endorsement.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function CapitalCard({
  label,
  value,
  caption,
  emphasis = false,
}: {
  label: string;
  value: string;
  caption: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-card rounded-xl p-5 shadow ring-1",
        emphasis ? "ring-primary/30" : "ring-foreground/6.5",
      )}
    >
      <p
        className={cn(
          "text-xs uppercase tracking-wide",
          emphasis ? "text-primary" : "text-muted-foreground",
        )}
      >
        {label}
      </p>
      <p className="text-foreground mt-2 text-2xl font-semibold tabular-nums">
        {value}
      </p>
      <p className="text-muted-foreground mt-2 text-sm text-balance">
        {caption}
      </p>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="min-w-0 break-all text-right">{children}</dd>
    </div>
  );
}
