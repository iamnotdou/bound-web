"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { CertListItem, CertStatusTag } from "@/lib/bound";
import { Address } from "@/components/app/address";
import { StatusBadge } from "@/components/app/status-badge";
import { formatExpiry, isExpired } from "@/components/app/relative-time";
import { cn } from "@/lib/utils";

type StatusFilter = "All" | CertStatusTag;

const STATUS_FILTERS: StatusFilter[] = [
  "All",
  "Verified",
  "Pending",
  "Invalid",
];

export function Marketplace({
  certificates,
}: {
  certificates: CertListItem[];
}) {
  const searchId = useId();
  const hideExpiredId = useId();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("All");
  const [hideExpired, setHideExpired] = useState(false);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return certificates.filter((cert) => {
      if (status !== "All" && cert.status !== status) return false;
      if (hideExpired && isExpired(cert.expiresAtUnix)) return false;
      if (!needle) return true;
      return (
        cert.agent.toLowerCase().includes(needle) ||
        (cert.auditor?.toLowerCase().includes(needle) ?? false)
      );
    });
  }, [certificates, query, status, hideExpired]);

  const filtersActive = query !== "" || status !== "All" || hideExpired;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      <header className="max-w-2xl">
        <span className="text-muted-foreground font-mono text-xs uppercase tracking-widest">
          Marketplace
        </span>
        <h1 className="text-foreground mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Bonded agents
        </h1>
        <p className="text-muted-foreground mt-3 text-balance">
          Every agent below has posted a surety bond on-chain. The bound is the
          maximum loss covered, the reserve is pre-funded by the operator, and
          the auditor stake is slashable third-party capital attesting to it.
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="w-full lg:max-w-sm">
          <label
            htmlFor={searchId}
            className="text-foreground mb-1.5 block text-sm font-medium"
          >
            Search by agent or auditor address
          </label>
          <div className="relative">
            <Search
              aria-hidden
              className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
            />
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="G…"
              className="bg-card ring-foreground/6.5 focus-visible:ring-ring h-10 w-full rounded-md px-9 text-sm shadow-sm ring-1 transition focus-visible:outline-none focus-visible:ring-2"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded focus-visible:outline-none focus-visible:ring-2"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <fieldset className="min-w-0">
            <legend className="text-foreground mb-1.5 flex items-center gap-1.5 text-sm font-medium">
              <SlidersHorizontal aria-hidden className="size-3.5" />
              Status
            </legend>
            <div
              role="group"
              className="bg-card ring-foreground/6.5 flex gap-1 overflow-x-auto rounded-md p-1 shadow-sm ring-1"
            >
              {STATUS_FILTERS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setStatus(option)}
                  aria-pressed={status === option}
                  className={cn(
                    "focus-visible:ring-ring shrink-0 rounded px-3 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2",
                    status === option
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex items-center gap-2 sm:pb-1.5">
            <input
              id={hideExpiredId}
              type="checkbox"
              checked={hideExpired}
              onChange={(event) => setHideExpired(event.target.checked)}
              className="accent-primary focus-visible:ring-ring size-4 rounded focus-visible:outline-none focus-visible:ring-2"
            />
            <label htmlFor={hideExpiredId} className="text-sm">
              Hide expired
            </label>
          </div>
        </div>
      </div>

      <p className="text-muted-foreground mt-4 text-sm" aria-live="polite">
        Showing {rows.length} of {certificates.length} certificates
      </p>

      {rows.length === 0 ? (
        <EmptyState
          filtersActive={filtersActive}
          onReset={() => {
            setQuery("");
            setStatus("All");
            setHideExpired(false);
          }}
        />
      ) : (
        <>
          <CertificateTable rows={rows} />
          <CertificateCards rows={rows} />
        </>
      )}
    </div>
  );
}

function CertificateTable({ rows }: { rows: CertListItem[] }) {
  return (
    <div className="ring-foreground/6.5 bg-card mt-5 hidden overflow-x-auto rounded-xl shadow ring-1 md:block">
      <table className="w-full min-w-200 border-collapse text-left text-sm">
        <caption className="sr-only">
          Bonded agents with their certificate capital and auditor
        </caption>
        <thead>
          <tr className="border-border text-muted-foreground border-b text-xs uppercase tracking-wide">
            <th scope="col" className="px-4 py-3 font-medium">
              Agent
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Status
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Bound
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Reserve
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Auditor stake
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Auditor
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Expires
            </th>
            <th scope="col" className="px-4 py-3">
              <span className="sr-only">Certificate</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((cert) => {
            const expired = isExpired(cert.expiresAtUnix);
            return (
              <tr
                key={cert.certId}
                className="border-border hover:bg-muted/40 border-b transition-colors last:border-b-0"
              >
                <td className="px-4 py-3">
                  <Address value={cert.agent} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={cert.status} expired={expired} />
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">
                  {cert.boundUsd}
                </td>
                <td className="text-muted-foreground px-4 py-3 text-right tabular-nums">
                  {cert.reserveUsd}
                </td>
                <td className="text-muted-foreground px-4 py-3 text-right tabular-nums">
                  {cert.auditorStakeUsd}
                </td>
                <td className="px-4 py-3">
                  <Address value={cert.auditor} edge={5} />
                </td>
                <td
                  className={cn(
                    "whitespace-nowrap px-4 py-3",
                    expired ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {formatExpiry(cert.expiresAtIso)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/app/cert/${cert.certId}`}
                    className="text-primary focus-visible:ring-ring rounded text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2"
                  >
                    View
                    <span className="sr-only"> certificate {cert.certId}</span>
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CertificateCards({ rows }: { rows: CertListItem[] }) {
  return (
    <ul className="mt-5 grid gap-3 md:hidden">
      {rows.map((cert) => {
        const expired = isExpired(cert.expiresAtUnix);
        return (
          <li key={cert.certId}>
            <Link
              href={`/app/cert/${cert.certId}`}
              className="ring-foreground/6.5 bg-card focus-visible:ring-ring block rounded-xl p-4 shadow ring-1 transition focus-visible:outline-none focus-visible:ring-2"
            >
              <div className="flex items-start justify-between gap-3">
                <Address value={cert.agent} edge={7} />
                <StatusBadge status={cert.status} expired={expired} />
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="text-muted-foreground text-xs">Bound</dt>
                  <dd className="font-medium tabular-nums">{cert.boundUsd}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Reserve</dt>
                  <dd className="tabular-nums">{cert.reserveUsd}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Stake</dt>
                  <dd className="tabular-nums">{cert.auditorStakeUsd}</dd>
                </div>
              </dl>
              <div className="text-muted-foreground mt-4 flex items-center justify-between gap-3 text-xs">
                <span className="truncate">
                  Auditor <Address value={cert.auditor} edge={4} />
                </span>
                <span className={cn(expired && "text-destructive")}>
                  {formatExpiry(cert.expiresAtIso)}
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function EmptyState({
  filtersActive,
  onReset,
}: {
  filtersActive: boolean;
  onReset: () => void;
}) {
  return (
    <div className="ring-foreground/6.5 bg-card mt-5 rounded-xl px-6 py-16 text-center shadow ring-1">
      <div className="bg-muted/60 mx-auto grid size-11 place-items-center rounded-full">
        <Search aria-hidden className="text-muted-foreground size-5" />
      </div>
      <h2 className="text-foreground mt-4 text-lg font-semibold">
        No certificates match
      </h2>
      <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-balance text-sm">
        {filtersActive
          ? "Nothing here fits the current search and filters. Widen them to see more bonded agents."
          : "No agent has posted a bond yet. Once one does, it shows up here the moment the certificate lands on-chain."}
      </p>
      {filtersActive && (
        <button
          type="button"
          onClick={onReset}
          className="text-primary focus-visible:ring-ring mt-4 rounded text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2"
        >
          Reset filters
        </button>
      )}
    </div>
  );
}
