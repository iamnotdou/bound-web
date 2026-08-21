import { Activity, TriangleAlert } from "lucide-react";
import type { SpendMeter } from "@/lib/bound";
import { formatUsdcExact, ratioPercent } from "@/components/app/usdc";
import { cn } from "@/lib/utils";

/**
 * What the PaymentRouter has metered against this certificate.
 *
 * The panel has three quite different things to say and only one of them is a
 * number, so it renders three different shapes rather than one shape with
 * blanks in it:
 *
 *  - The router could not be read at all. Say that. A failed read is not a
 *    reading of zero.
 *  - The agent never enrolled. Its payments are ordinary token transfers that
 *    never reach the counter, so this certificate has no metered conduct and
 *    none of the numbers below would mean anything.
 *  - The agent is enrolled, and the counter says what it says.
 */
export function SpendMeterPanel({
  meter,
  certId,
}: {
  meter: SpendMeter | null;
  certId: number;
}) {
  return (
    <section
      aria-labelledby="meter-heading"
      className="ring-foreground/6.5 bg-card mt-10 rounded-xl p-6 shadow ring-1"
    >
      <h2
        id="meter-heading"
        className="text-foreground flex items-center gap-2 text-lg font-semibold"
      >
        <Activity aria-hidden className="text-primary size-5" />
        Metered conduct
      </h2>

      {meter === null ? (
        <p className="text-muted-foreground mt-2 text-sm text-balance">
          The payment router could not be read just now. That is a failure to
          get an answer, not an answer — nothing below should be inferred from
          it.
        </p>
      ) : !meter.enrolled ? (
        <p className="text-muted-foreground mt-2 text-sm text-balance">
          This agent is not enrolled in the payment router. Its payments settle
          as ordinary token transfers and never reach the spend counter, so
          there is no metered conduct to show and{" "}
          <strong className="text-foreground">
            nothing here is a statement about what it has spent
          </strong>
          . Enrollment is what puts an agent on the metered rail, and it needs
          the operator&apos;s signature and the agent&apos;s own.
        </p>
      ) : meter.meteredCertId !== certId ? (
        <p className="text-muted-foreground mt-2 text-sm text-balance">
          This agent is metered against certificate #{meter.meteredCertId}, not
          #{certId}. An enrollment is permanent: an operator cannot walk an
          agent off a certificate whose counter is climbing and onto a clean
          one, because a counter you can escape is not evidence. This
          certificate&apos;s counter is therefore not this agent&apos;s conduct.
        </p>
      ) : (
        <MeterBody meter={meter} />
      )}
    </section>
  );
}

function MeterBody({ meter }: { meter: SpendMeter }) {
  const spent = BigInt(meter.spentStroops);
  const bound = BigInt(meter.boundStroops);
  const over = bound > 0n && spent > bound;
  const spentPct = ratioPercent(spent, bound);

  return (
    <>
      <p className="text-muted-foreground mt-2 text-sm text-balance">
        Every payment this agent routes moves a counter the contracts hold. That
        counter — checked against the bound printed on the certificate — is the
        whole of the <strong className="text-foreground">BoundExceeded</strong>{" "}
        proof. No oracle reads it and no referee rules on it.
      </p>

      <dl className="mt-5 space-y-4">
        <Metered
          label="Routed spend"
          value={formatUsdcExact(spent)}
          against={`of a ${formatUsdcExact(bound)} bound`}
          percent={spentPct}
          alarm={over}
        />
        <Metered
          label="Float held by the router"
          value={formatUsdcExact(meter.floatStroops)}
          against={
            meter.floatCapStroops === null
              ? "no cap reported by the router"
              : `of a ${formatUsdcExact(meter.floatCapStroops)} cap`
          }
          percent={
            meter.floatCapStroops === null
              ? null
              : ratioPercent(meter.floatStroops, meter.floatCapStroops)
          }
        />
      </dl>

      <p className="text-muted-foreground mt-4 text-sm text-balance">
        The float cap is the deposit ceiling — the most a stolen agent key can
        reach at any one moment. It bounds what is exposed, not what the agent
        may spend in total.
      </p>

      {over ? (
        <div className="ring-destructive/30 bg-destructive/5 mt-5 rounded-lg p-4 ring-1">
          <h3 className="text-destructive flex items-center gap-2 text-sm font-semibold">
            <TriangleAlert aria-hidden className="size-4" />
            This certificate&apos;s routed spend has passed its bound
          </h3>
          <p className="text-foreground mt-2 text-sm text-balance">
            Anyone can prove that on-chain, by arithmetic, without anyone&apos;s
            permission.
          </p>
          <p className="text-muted-foreground mt-2 text-sm text-balance">
            It is{" "}
            <strong className="text-foreground">
              not a loss, not an amount owed, and not evidence that anybody was
              harmed
            </strong>
            . Gross flow is not harm — a dollar shuttled between two addresses
            one operator controls drives this counter past any bound for the
            price of gas. What it proves is that the operator promised a ceiling
            and their own agent&apos;s metered conduct went past it. Sizing a
            payout takes harm proven against a party outside the operator&apos;s
            control, which this is not.
          </p>
        </div>
      ) : null}
    </>
  );
}

function Metered({
  label,
  value,
  against,
  percent,
  alarm = false,
}: {
  label: string;
  value: string;
  against: string;
  percent: number | null;
  alarm?: boolean;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <dt className="text-muted-foreground text-sm">{label}</dt>
        <dd className="text-right text-sm">
          <span
            className={cn(
              "font-semibold tabular-nums",
              alarm ? "text-destructive" : "text-foreground",
            )}
          >
            {value}
          </span>{" "}
          <span className="text-muted-foreground">{against}</span>
        </dd>
      </div>
      {percent === null ? null : (
        <div
          className="bg-foreground/8 mt-2 h-1.5 overflow-hidden rounded-full"
          role="img"
          aria-label={`${percent}%`}
        >
          <div
            className={cn(
              "h-full rounded-full",
              alarm ? "bg-destructive" : "bg-primary",
            )}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
