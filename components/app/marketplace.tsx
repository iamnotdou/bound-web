"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, SlidersHorizontal, X } from "lucide-react";
import type { CertListItem, CertPage, CertStatusTag } from "@/lib/bound";
import { Address } from "@/components/app/address";
import { AgentAvatar } from "@/components/app/agent-avatar";
import { DemoAuditorNote } from "@/components/app/demo-auditor-note";
import { StatusBadge, STATUS_LABELS } from "@/components/app/status-badge";
import {
  formatExpiry,
  isExpired,
  relativeFromNow,
} from "@/components/app/relative-time";
import { isDemoAuditor } from "@/lib/cert-state";
import { useWallet } from "@/lib/wallet/wallet-provider";
import { cn } from "@/lib/utils";

type StatusFilter = "All" | CertStatusTag;

const STATUS_FILTERS: StatusFilter[] = [
  "All",
  "Verified",
  "Pending",
  "Invalid",
];

const FILTER_LABELS: Record<StatusFilter, string> = {
  All: "All",
  ...STATUS_LABELS,
};

type SortKey = "newest" | "oldest" | "expiring";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "expiring", label: "Expiring soonest" },
];

export function Marketplace({ page, now }: { page: CertPage; now: number }) {
  const searchId = useId();
  const sortId = useId();
  const hideExpiredId = useId();
  const onlyMineId = useId();
  const { address } = useWallet();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("All");
  const [sort, setSort] = useState<SortKey>("newest");
  const [hideExpired, setHideExpired] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);

  const certificates = page.items;
  const nowMs = now * 1000;

  /**
   * How many certificates on this page sit in each state.
   *
   * Counted before the status filter is applied, so the number on a tab is
   * what picking that tab would show rather than what is showing already.
   */
  const counts = useMemo(() => {
    const tally = { All: 0, Verified: 0, Pending: 0, Invalid: 0, expired: 0 };
    for (const cert of certificates) {
      tally.All += 1;
      tally[cert.status] += 1;
      if (isExpired(cert.expiresAtUnix, nowMs)) tally.expired += 1;
    }
    return tally;
  }, [certificates, nowMs]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    // "#18" and "18" are what somebody types after reading a card, and an
    // address is what they paste. Both are the same box.
    const wanted = needle.replace(/^#/, "");
    const byNumber = /^\d+$/.test(wanted) ? Number(wanted) : null;
    const filtered = certificates.filter((cert) => {
      if (status !== "All" && cert.status !== status) return false;
      if (hideExpired && isExpired(cert.expiresAtUnix, nowMs)) return false;
      if (onlyMine) {
        if (!address) return false;
        if (cert.agent !== address && cert.auditor !== address) return false;
      }
      if (!needle) return true;
      if (byNumber !== null && cert.certId === byNumber) return true;
      return (
        cert.agent.toLowerCase().includes(needle) ||
        (cert.auditor?.toLowerCase().includes(needle) ?? false)
      );
    });

    // The registry hands this page back newest first, so "newest" is the order
    // it arrived in and needs no comparator of its own.
    if (sort === "oldest") return [...filtered].reverse();
    if (sort === "expiring") {
      // A certificate with no expiry sorts last rather than first: zero is the
      // absence of an end date, not an end date in 1970.
      return [...filtered].sort((a, b) => {
        const left = a.expiresAtUnix > 0 ? a.expiresAtUnix : Infinity;
        const right = b.expiresAtUnix > 0 ? b.expiresAtUnix : Infinity;
        return left - right;
      });
    }
    return filtered;
  }, [
    certificates,
    query,
    status,
    sort,
    hideExpired,
    onlyMine,
    address,
    nowMs,
  ]);

  const filtersActive =
    query !== "" || status !== "All" || hideExpired || onlyMine;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      <header className="max-w-3xl">
        <span className="text-muted-foreground font-mono text-xs uppercase tracking-widest">
          Marketplace
        </span>
        <h1 className="text-foreground mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Browse bonded agents
        </h1>
        <p className="text-muted-foreground mt-3 text-balance">
          A bond is what an agent&apos;s operator has published on-chain: a
          ceiling on what the certificate can pay out, a reserve it claims to
          have set aside, and — once an auditor attests — that auditor&apos;s
          own slashable stake. Claimed is not the same as held: open a
          certificate to see what its vault actually holds.
        </p>
      </header>

      <Summary page={page} counts={counts} />

      <Glossary />

      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="w-full lg:max-w-sm">
          <label
            htmlFor={searchId}
            className="text-foreground mb-1.5 block text-sm font-medium"
          >
            Search this page
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
              placeholder="Address, or a certificate number"
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

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <fieldset className="min-w-0">
            <legend className="text-foreground mb-1.5 flex items-center gap-1.5 text-sm font-medium">
              <SlidersHorizontal aria-hidden className="size-3.5" />
              Show
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
                    "focus-visible:ring-ring inline-flex shrink-0 items-center gap-1.5 rounded px-3 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2",
                    status === option
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  {FILTER_LABELS[option]}
                  <span
                    className={cn(
                      "rounded px-1 text-xs tabular-nums",
                      status === option
                        ? "bg-primary-foreground/20"
                        : "bg-muted-foreground/10",
                    )}
                  >
                    {counts[option]}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="min-w-0">
            <label
              htmlFor={sortId}
              className="text-foreground mb-1.5 block text-sm font-medium"
            >
              Sort
            </label>
            <select
              id={sortId}
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="bg-card ring-foreground/6.5 focus-visible:ring-ring h-10 w-full rounded-md px-3 text-sm shadow-sm ring-1 transition focus-visible:outline-none focus-visible:ring-2"
            >
              {SORTS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2 sm:pb-2.5">
            <div className="flex items-center gap-2">
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
            <div className="flex items-center gap-2">
              <input
                id={onlyMineId}
                type="checkbox"
                checked={onlyMine}
                disabled={!address}
                onChange={(event) => setOnlyMine(event.target.checked)}
                className="accent-primary focus-visible:ring-ring size-4 rounded focus-visible:outline-none focus-visible:ring-2 disabled:opacity-40"
              />
              <label
                htmlFor={onlyMineId}
                className={cn("text-sm", !address && "text-muted-foreground")}
                title={
                  address
                    ? "Certificates where the connected wallet is the agent or the auditor"
                    : "Connect a wallet to filter to your own certificates"
                }
              >
                Only mine
              </label>
            </div>
          </div>
        </div>
      </div>

      <p className="text-muted-foreground mt-4 text-sm" aria-live="polite">
        {rows.length === certificates.length
          ? `Showing all ${certificates.length} certificates on this page.`
          : `Showing ${rows.length} of ${certificates.length} certificates on this page.`}
        {page.total > certificates.length ? (
          <>
            {" "}
            Search, filters and sorting apply to this page — use Previous and
            Next for the other {page.total - certificates.length} in the
            registry.
          </>
        ) : null}
        {onlyMine && !address ? " Connect a wallet to use “only mine”." : ""}
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
        <CertificateGrid rows={rows} now={nowMs} />
      )}

      <Pagination page={page} />
    </div>
  );
}

/**
 * The orientation strip: how big the registry is, and what shape this page of
 * it is in.
 *
 * Deliberately counts rather than sums. The obvious dashboard headline here
 * would be total coverage — add up every bound and print one big number — and
 * it would be the most misleading figure in the app: a bound is a ceiling, the
 * reserve behind it is only *claimed* until a vault is read, and summing
 * ceilings across strangers' certificates produces a number nobody is owed. A
 * count of certificates is a fact about the registry; a sum of bounds would be
 * a promise about capital.
 */
function Summary({
  page,
  counts,
}: {
  page: CertPage;
  counts: Record<StatusFilter, number> & { expired: number };
}) {
  const tiles: { label: string; value: number; note: string }[] = [
    {
      label: "In the registry",
      value: page.total,
      note: `Page ${page.page} of ${page.pageCount}`,
    },
    {
      label: STATUS_LABELS.Verified,
      value: counts.Verified,
      note: "An auditor staked on these",
    },
    {
      label: STATUS_LABELS.Pending,
      value: counts.Pending,
      note: "Nobody has attested yet",
    },
    {
      label: "Expired",
      value: counts.expired,
      note: "Past their end date",
    },
  ];

  return (
    <>
      <dl className="bg-border/70 ring-foreground/6.5 mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl shadow-sm ring-1 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="bg-card px-5 py-4">
            <dt className="text-muted-foreground text-xs uppercase tracking-wide">
              {tile.label}
            </dt>
            <dd className="text-foreground mt-1 text-2xl font-semibold tabular-nums">
              {tile.value}
            </dd>
            <p className="text-muted-foreground mt-0.5 text-xs">{tile.note}</p>
          </div>
        ))}
      </dl>
      <p className="text-muted-foreground mt-2 text-xs">
        Every figure but the registry total counts the {counts.All} certificates
        on this page.
      </p>
    </>
  );
}

/**
 * Four words this page cannot avoid using, in plain language.
 *
 * Closed by default and open in one click: a newcomer needs the definitions
 * and everybody else needs them out of the way. `<details>` rather than a
 * modal or an accordion component — it is one tag, it works before hydration,
 * and it is searchable by the browser's own find.
 */
function Glossary() {
  const terms: { term: string; plain: string }[] = [
    {
      term: "Covers up to",
      plain:
        "The most a certificate can pay out — the “bound”. It is a ceiling, not a balance, and nothing here says an agent will ever owe it.",
    },
    {
      term: "Reserve claimed",
      plain:
        "What the operator recorded on the certificate. Publishing writes the number; it does not move the money. The certificate page reads the vault live and shows both figures.",
    },
    {
      term: "Auditor's stake",
      plain:
        "A third party's own capital, which the contracts can take away if its attestation turns out to be wrong. That is what makes an attestation cost something.",
    },
    {
      term: "Verified",
      plain:
        "An auditor staked capital and attested to this certificate. It is not a safety rating and it is not a statement about what the agent does.",
    },
  ];

  return (
    <details className="group ring-foreground/6.5 bg-card mt-4 rounded-xl shadow-sm ring-1">
      <summary className="focus-visible:ring-ring marker:content-none flex cursor-pointer list-none items-center [&::-webkit-details-marker]:hidden justify-between gap-3 rounded-xl px-5 py-3.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2">
        What these words mean
        <span className="text-muted-foreground text-xs font-normal">
          <span className="group-open:hidden">Show</span>
          <span className="hidden group-open:inline">Hide</span>
        </span>
      </summary>
      <dl className="border-border grid gap-4 border-t px-5 py-4 sm:grid-cols-2">
        {terms.map((entry) => (
          <div key={entry.term}>
            <dt className="text-foreground text-sm font-medium">
              {entry.term}
            </dt>
            <dd className="text-muted-foreground mt-1 text-sm text-balance">
              {entry.plain}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

/**
 * Server pagination, as links.
 *
 * `?page=N` rather than client state, so a page of the registry is a URL
 * somebody can send to somebody else — and so the server never has to load a
 * hundred certificates to render ten.
 */
function Pagination({ page }: { page: CertPage }) {
  if (page.pageCount <= 1) return null;
  const previous = page.page > 1 ? page.page - 1 : null;
  const next = page.page < page.pageCount ? page.page + 1 : null;

  const base =
    "inline-flex h-9 items-center rounded-md px-3 text-sm font-medium transition";
  const enabled =
    "ring-foreground/6.5 bg-card text-foreground hover:bg-muted/50 focus-visible:ring-ring shadow-sm ring-1 focus-visible:outline-none focus-visible:ring-2";
  const disabled = "text-muted-foreground/60 cursor-default";

  return (
    <nav
      aria-label="Certificate pages"
      className="mt-8 flex items-center justify-between gap-3"
    >
      {previous === null ? (
        <span className={cn(base, disabled)}>← Previous</span>
      ) : (
        <Link href={`/app?page=${previous}`} className={cn(base, enabled)}>
          ← Previous
        </Link>
      )}
      <span className="text-muted-foreground text-sm tabular-nums">
        Page {page.page} of {page.pageCount}
      </span>
      {next === null ? (
        <span className={cn(base, disabled)}>Next →</span>
      ) : (
        <Link href={`/app?page=${next}`} className={cn(base, enabled)}>
          Next →
        </Link>
      )}
    </nav>
  );
}

/**
 * The listing, as a card per certificate.
 *
 * A row per agent made the six numbers easy to compare and the agents
 * themselves hard to tell apart — which is backwards for a marketplace, where
 * the question is "who is this" before it is "how much". So each certificate
 * gets a card with the agent's face on it, the payout ceiling as the one
 * figure sized like it matters, and the rest kept small.
 *
 * One layout at every width, rather than a table that becomes cards below
 * `md`: two renderings of the same rows is two places for them to drift.
 */
function CertificateGrid({ rows, now }: { rows: CertListItem[]; now: number }) {
  return (
    <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((cert) => (
        <CertificateCard key={cert.certId} cert={cert} now={now} />
      ))}
    </ul>
  );
}

function CertificateCard({ cert, now }: { cert: CertListItem; now: number }) {
  const expired = isExpired(cert.expiresAtUnix, now);

  return (
    <li>
      <Link
        href={`/app/cert/${cert.certId}`}
        className="blobatar-host group ring-foreground/6.5 bg-card hover:ring-foreground/15 focus-visible:ring-ring flex h-full flex-col rounded-xl p-5 shadow-sm ring-1 transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2"
      >
        <div className="flex items-start gap-3">
          <AgentAvatar address={cert.agent} size={44} animate />
          <div className="min-w-0 flex-1">
            <span className="text-muted-foreground text-xs">Agent</span>
            <Address
              value={cert.agent}
              edge={6}
              className="group-hover:text-primary mt-0.5 block truncate transition-colors"
            />
          </div>
          <StatusBadge
            status={cert.status}
            expired={expired}
            className="shrink-0"
          />
        </div>

        <div className="mt-5">
          <dl>
            <dt className="text-muted-foreground text-xs uppercase tracking-wide">
              Covers up to
            </dt>
            <dd className="text-foreground mt-1 text-2xl font-semibold tabular-nums tracking-tight">
              {cert.boundUsd}
            </dd>
          </dl>

          <dl className="bg-border/70 mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg">
            <div className="bg-muted/40 px-3 py-2.5">
              <dt className="text-muted-foreground text-xs">Reserve claimed</dt>
              <dd className="mt-0.5 text-sm font-medium tabular-nums">
                {cert.reserveUsd}
              </dd>
            </div>
            <div className="bg-muted/40 px-3 py-2.5">
              <dt className="text-muted-foreground text-xs">
                Auditor&apos;s stake
              </dt>
              <dd className="mt-0.5 text-sm font-medium tabular-nums">
                {cert.auditorStakeUsd}
              </dd>
            </div>
          </dl>
        </div>

        <div className="border-border mt-5 flex items-center justify-between gap-3 border-t pt-4 text-xs">
          <span className="text-muted-foreground flex min-w-0 items-center gap-1.5">
            {cert.auditor ? (
              <AgentAvatar address={cert.auditor} size={18} />
            ) : null}
            <span className="truncate">
              {cert.auditor ? (
                <>
                  Checked by <Address value={cert.auditor} edge={4} />
                </>
              ) : (
                "No auditor yet"
              )}
            </span>
          </span>
          <span
            className={cn(
              "shrink-0",
              expired ? "text-destructive" : "text-muted-foreground",
            )}
            title={formatExpiry(cert.expiresAtIso)}
          >
            <Expiry unix={cert.expiresAtUnix} now={now} expired={expired} />
          </span>
        </div>

        {isDemoAuditor(cert.auditor) ? (
          <DemoAuditorNote compact className="mt-3 self-start" />
        ) : null}

        <span className="text-muted-foreground group-hover:text-primary mt-4 inline-flex items-center gap-1 self-end text-xs font-medium transition-colors">
          Certificate #{cert.certId}
          <ArrowRight
            aria-hidden
            className="size-3.5 transition-transform group-hover:translate-x-0.5"
          />
        </span>
      </Link>
    </li>
  );
}

/**
 * "Expires in 3 months" beats "Mar 3, 2026" on a card somebody is scanning:
 * the question being asked is how much runway is left, not which Tuesday it
 * runs out. The exact date stays on the element's `title`, and on the
 * certificate page.
 */
function Expiry({
  unix,
  now,
  expired,
}: {
  unix: number;
  now: number;
  expired: boolean;
}) {
  if (unix <= 0) return <>No expiry</>;
  const relative = relativeFromNow(unix, now);
  return <>{expired ? `Expired ${relative}` : `Expires ${relative}`}</>;
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
        Nothing on this page matches
      </h2>
      <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-balance text-sm">
        {filtersActive
          ? "Nothing here fits the current search and filters. Widen them, or try another page of the registry."
          : "No agent has posted a bond yet. Once one does, it shows up here the moment the certificate lands on-chain."}
      </p>
      {filtersActive && (
        <button
          type="button"
          onClick={onReset}
          className="text-primary focus-visible:ring-ring mt-4 rounded text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2"
        >
          Clear search and filters
        </button>
      )}
    </div>
  );
}
