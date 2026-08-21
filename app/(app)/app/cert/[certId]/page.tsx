import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info, ShieldAlert } from "lucide-react";
import { Address } from "@/components/app/address";
import { StatusBadge } from "@/components/app/status-badge";
import {
  formatExpiry,
  isExpired,
  relativeFromNow,
} from "@/components/app/relative-time";
import { getCertificate } from "@/lib/bound";
import { cn } from "@/lib/utils";

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
  const cert = parsed === null ? null : await getCertificate(parsed);

  if (!cert) return { title: "Certificate not found" };

  return {
    title: `Certificate #${cert.certId}`,
    description: `${cert.status} certificate bounding losses at ${cert.boundUsd}, with ${cert.reserveUsd} reserved and ${cert.auditorStakeUsd} staked by the auditor.`,
  };
}

export default async function CertificatePage({
  params,
}: PageProps<"/app/cert/[certId]">) {
  const { certId } = await params;
  const parsed = parseCertId(certId);
  const cert = parsed === null ? null : await getCertificate(parsed);

  if (!cert) notFound();

  const expired = isExpired(cert.expiresAtUnix);

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
            cert.valid ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {cert.valid
            ? "This certificate is verified and unexpired — the only state a counterparty should accept."
            : expired
              ? "This certificate has expired. Its capital commitments no longer bind."
              : `This certificate is ${cert.status.toLowerCase()} and should not be relied on as cover.`}
        </p>
      </header>

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
          value={cert.reserveUsd}
          caption="Pre-funded by the operator and locked against the bound."
        />
        <CapitalCard
          label="Auditor stake"
          value={cert.auditorStakeUsd}
          caption="Slashable third-party capital the auditor put behind its attestation."
        />
      </div>
      <p className="text-muted-foreground mt-3 text-sm">
        Reserve and auditor stake sit underneath the bound: the bound is what a
        counterparty can lose at most, the other two are what is actually posted
        today.
      </p>

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
        <Row label="Status">
          <StatusBadge status={cert.status} expired={expired} />
        </Row>
        <Row label="Auditor">
          {cert.auditor ? (
            <Address value={cert.auditor} edge={10} />
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
        <Row label="On-chain record">
          <span className="text-muted-foreground text-sm">
            {cert.hasCert ? "Certificate present" : "No certificate issued"}
          </span>
        </Row>
      </dl>

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
            <ul className="text-muted-foreground mt-2 space-y-2 text-sm">
              <li>
                Capital is committed on-chain up to the bound shown above.
              </li>
              <li>The operator has pre-funded the reserve.</li>
              <li>
                A named third-party auditor staked slashable capital attesting
                to this certificate.
              </li>
              <li>Anyone can verify all of the above independently.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-foreground text-sm font-medium">
              What it does not prove
            </h3>
            <ul className="text-muted-foreground mt-2 space-y-2 text-sm">
              <li>
                It does <strong className="text-foreground">not</strong> prove
                the agent will behave, perform well, or act in your interest.
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
    </div>
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
