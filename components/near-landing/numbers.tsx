import Link from "next/link";
import { ArrowLink } from "@/components/navy/arrow-link";
import { Section } from "@/components/navy/section";
import { Text } from "@/components/navy/text";
import { BOUND_CONTRACT } from "@/lib/near/deployment";
import {
  coverage,
  explorerAccount,
  formatMusdc,
  type CertView,
} from "@/lib/near/format";

/**
 * Navy's Numbers section with the live testnet figures. Every value is a
 * view call made when the page rendered; a failed read says so and never
 * turns into a zero.
 */
type Stat = {
  label: string;
  value: string | null;
  unit?: string;
  text: React.ReactNode;
};

export function Numbers({
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
  const missing = readFailed
    ? "Could not be read just now; reload."
    : `No certificate #${certId} on the contract.`;

  const stats: Stat[] = [
    {
      label: `Coverage of certificate #${certId}`,
      value: cov ? formatMusdc(cov.victimCover) : null,
      unit: "mUSDC",
      text:
        view && cov
          ? `reserve ${formatMusdc(view.reserve_locked)} mUSDC + auditor stake ${formatMusdc(view.allocation)} mUSDC, bound ${formatMusdc(view.bound)} mUSDC`
          : missing,
    },
    {
      label: "Reserve",
      value: view ? formatMusdc(view.reserve_locked) : null,
      unit: "mUSDC",
      text: view
        ? "The bond: pre-funded by the operator and locked in the contract."
        : missing,
    },
    {
      label: "Auditor stake",
      value: view ? formatMusdc(view.allocation) : null,
      unit: "mUSDC",
      text: view
        ? "The insurance layer: slashable, pays what the reserve could not."
        : missing,
    },
    {
      label: "Certificates on the contract",
      value: certCount == null ? null : String(certCount),
      text:
        certCount == null
          ? "Could not be read just now; reload."
          : "Counted by a view call when this page rendered.",
    },
  ];

  const statusTone =
    view?.status === "Verified"
      ? "text-primary"
      : view?.status === "Invalid"
        ? "text-destructive"
        : "text-foreground";

  return (
    <Section
      aria-labelledby="live-heading"
      label="Live on testnet"
      full={
        <>
          <dl className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="flex min-w-0 flex-col">
                <dt className="order-2 mt-6">
                  <Text
                    tag="span"
                    variant="textBase"
                    className="text-foreground font-medium"
                  >
                    {stat.label}
                  </Text>
                </dt>
                <dd className="order-1">
                  {stat.value != null ? (
                    <Text
                      tag="span"
                      variant="display3XL"
                      className="text-foreground tracking-tight tabular-nums"
                    >
                      {stat.value}
                      {stat.unit && (
                        <Text
                          tag="span"
                          variant="displayXS"
                          className="text-primary ml-2"
                        >
                          {stat.unit}
                        </Text>
                      )}
                    </Text>
                  ) : (
                    <Text
                      tag="span"
                      variant="displaySM"
                      className="text-faint-foreground"
                    >
                      unreadable
                    </Text>
                  )}
                </dd>
                <dd className="order-3 mt-1">
                  <Text
                    tag="p"
                    variant="textSM"
                    className="text-muted-foreground text-pretty tabular-nums"
                  >
                    {stat.text}
                  </Text>
                </dd>
              </div>
            ))}
          </dl>
          <dl className="border-border mt-16 grid gap-6 border-t pt-6 sm:grid-cols-3 sm:items-end">
            <div>
              <dt>
                <Text
                  tag="span"
                  variant="textXS"
                  className="text-muted-foreground uppercase"
                >
                  Status
                </Text>
              </dt>
              <dd className="mt-1">
                <Text
                  tag="span"
                  variant="textBase"
                  className={`font-medium ${statusTone}`}
                >
                  {view ? view.status : "unreadable"}
                  {view?.halted ? ", halted" : ""}
                </Text>
              </dd>
            </div>
            <div className="min-w-0">
              <dt>
                <Text
                  tag="span"
                  variant="textXS"
                  className="text-muted-foreground uppercase"
                >
                  Agent
                </Text>
              </dt>
              <dd className="mt-1">
                <Text
                  tag="a"
                  variant="textBase"
                  href={explorerAccount(agent)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-foreground hover:text-muted-foreground wrap-anywhere underline decoration-border underline-offset-4"
                >
                  {agent}
                </Text>
              </dd>
            </div>
            <div className="sm:justify-self-end">
              <ArrowLink asChild>
                <Link href={`/app/near?agent=${agent}`}>
                  Check this agent&apos;s cover
                </Link>
              </ArrowLink>
            </div>
          </dl>
        </>
      }
    >
      <Text
        tag="h2"
        id="live-heading"
        variant="displayMD"
        className="text-foreground max-w-xl tracking-tight text-balance"
      >
        The cover behind this agent, <em>read just now</em>
      </Text>
      <Text
        tag="p"
        variant="textBase"
        className="text-muted-foreground mt-4 max-w-xl text-pretty"
      >
        These numbers come from{" "}
        <a
          href={explorerAccount(BOUND_CONTRACT)}
          target="_blank"
          rel="noreferrer"
          className="text-foreground hover:text-muted-foreground wrap-anywhere underline decoration-border underline-offset-4"
        >
          {BOUND_CONTRACT}
        </a>{" "}
        when this page rendered. A failed read says so; it never turns into a
        zero.
      </Text>
    </Section>
  );
}
