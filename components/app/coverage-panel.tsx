import { Coins } from "lucide-react";
import type { Coverage } from "@/lib/bound";
import { formatUsdcExact, ratioPercent } from "@/components/app/usdc";

/**
 * The coverage economy for one certificate.
 *
 * The distinction this panel exists to hold is between a *quote* and an
 * *accrual*. An unpaid certificate has a price and nothing else: no premium has
 * been paid, no yield has accrued, and there may not even be an auditor to
 * accrue it to. Rendering that as "$0 accrued" would read as a paid policy
 * earning nothing, which is a different and false claim, so the unpaid case
 * gets its own shape and never shows an accrual field at all.
 */
export function CoveragePanel({
  coverage,
  status,
}: {
  coverage: Coverage | null;
  status: string;
}) {
  return (
    <section
      aria-labelledby="coverage-heading"
      className="ring-foreground/6.5 bg-card mt-10 rounded-xl p-6 shadow ring-1"
    >
      <h2
        id="coverage-heading"
        className="text-foreground flex items-center gap-2 text-lg font-semibold"
      >
        <Coins aria-hidden className="text-primary size-5" />
        Coverage and yield
      </h2>

      {coverage === null ? (
        <p className="text-muted-foreground mt-2 text-sm text-balance">
          The premium vault could not be read just now. That is a failure to get
          an answer rather than an answer.
        </p>
      ) : coverage.paid ? (
        <Paid coverage={coverage} />
      ) : (
        <Unpaid coverage={coverage} status={status} />
      )}
    </section>
  );
}

function Unpaid({ coverage, status }: { coverage: Coverage; status: string }) {
  return (
    <>
      <p className="text-muted-foreground mt-2 text-sm text-balance">
        No premium has been paid on this certificate, so{" "}
        <strong className="text-foreground">
          no yield has accrued to anyone
        </strong>
        . The figure below is a price, not a balance.
      </p>

      <dl className="mt-5 space-y-3 text-sm">
        <Row label="Premium if bought">
          {formatUsdcExact(coverage.quoteStroops)}
        </Row>
      </dl>

      <p className="text-muted-foreground mt-4 text-sm text-balance">
        Priced <span className="font-address">bound × rate × term</span>,
        annualised. The term is the certificate&apos;s whole life rather than
        the time left on it, so the price is fixed at publication and waiting
        does not make cover cheaper.
      </p>
      {status !== "Verified" ? (
        <p className="text-muted-foreground mt-3 text-sm text-balance">
          Coverage cannot be bought on a {status.toLowerCase()} certificate at
          all: the premium is yield on an auditor&apos;s staked capital, and
          until one has attested there is no auditor for it to accrue to.
        </p>
      ) : null}
    </>
  );
}

function Paid({ coverage }: { coverage: Coverage }) {
  const accrued = coverage.accruedStroops;
  const claimable = coverage.claimableStroops;
  const pct =
    accrued === null ? null : ratioPercent(accrued, coverage.quoteStroops);

  return (
    <>
      <p className="text-muted-foreground mt-2 text-sm text-balance">
        The operator has paid for cover, and it is being earned rather than
        banked: the premium accrues to the auditor in a straight line across the
        certificate&apos;s term, less a protocol fee that left in the same
        transaction the premium was paid.
      </p>

      <dl className="mt-5 space-y-3 text-sm">
        <Row label="Premium paid">{formatUsdcExact(coverage.quoteStroops)}</Row>
        <Row label="Accrued to the auditor so far">
          {accrued === null ? "—" : formatUsdcExact(accrued)}
          {pct === null ? null : (
            <span className="text-muted-foreground font-normal">
              {" "}
              ({pct}% of the premium)
            </span>
          )}
        </Row>
        <Row label="Claimable right now">
          {claimable === null ? "—" : formatUsdcExact(claimable)}
        </Row>
      </dl>

      <p className="text-muted-foreground mt-4 text-sm text-balance">
        The auditor may withdraw at any point. A slash forfeits only what is
        still <em>unclaimed</em>, which is deliberate: the premium is yield on
        the stake, not a second bond, and counting unclaimed yield as collateral
        would overstate the cover. What a slash really takes is the
        auditor&apos;s allocated stake, shown above.
      </p>
    </>
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
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground min-w-0 break-all text-right font-semibold tabular-nums">
        {children}
      </dd>
    </div>
  );
}
