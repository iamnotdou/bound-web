import Link from "next/link";
import { ArrowLink } from "@/components/navy/arrow-link";
import { Section } from "@/components/navy/section";
import { Text } from "@/components/navy/text";
import { BOUND_CONTRACT } from "@/lib/near/deployment";
import { NEAR_RUN_ID, NEAR_RUN_PATH } from "@/lib/near/links";

/** The proof as a hairline list: code hash (live), the run, its page. */
export function Proof({
  codeHashMatches,
  txs,
  asserts,
}: {
  codeHashMatches: boolean | null;
  txs: number;
  asserts: number;
}) {
  const rows: { title: string; text: React.ReactNode }[] = [
    {
      title: "Code hash matches the build",
      text:
        codeHashMatches === null ? (
          <>The contract&apos;s code hash could not be read just now.</>
        ) : codeHashMatches ? (
          <>
            The on-chain code hash of{" "}
            <span className="text-foreground wrap-anywhere">
              {BOUND_CONTRACT}
            </span>{" "}
            <span className="text-primary font-medium">matches</span> the wasm
            built from the tagged commit, read live.
          </>
        ) : (
          <>
            The on-chain code hash{" "}
            <span className="text-destructive font-medium">does not match</span>{" "}
            the recorded build. Treat this deployment as changed.
          </>
        ),
    },
    {
      title: `${txs} of ${txs} recorded transactions`,
      text: (
        <>
          Run {NEAR_RUN_ID} recorded {txs} transactions and {asserts}{" "}
          assertions, all passing. Its page asks an archival node for the status
          of every hash when it loads.
        </>
      ),
    },
    {
      title: "Open the run",
      text: (
        <>
          Every step, signer, method and refusal, with links to NearBlocks.
          <span className="mt-3 block">
            <ArrowLink asChild>
              <Link href={NEAR_RUN_PATH}>Run {NEAR_RUN_ID}</Link>
            </ArrowLink>
          </span>
        </>
      ),
    },
  ];

  return (
    <Section aria-labelledby="proof-heading" label="Proof">
      <div className="grid gap-12 lg:grid-cols-9 lg:gap-x-8">
        <div className="lg:col-span-4">
          <Text
            tag="h2"
            id="proof-heading"
            variant="displayMD"
            className="text-foreground tracking-tight text-balance"
          >
            The cover is <em>on chain</em>, and so is the payout
          </Text>
        </div>
        <dl className="border-border border-b lg:col-span-5">
          {rows.map((row) => (
            <div
              key={row.title}
              className="border-border grid gap-2 border-t py-6 sm:grid-cols-2 sm:gap-8"
            >
              <dt>
                <Text
                  tag="span"
                  variant="textBase"
                  className="text-foreground font-medium tabular-nums"
                >
                  {row.title}
                </Text>
              </dt>
              <dd>
                <Text
                  tag="p"
                  variant="textSM"
                  className="text-muted-foreground text-pretty"
                >
                  {row.text}
                </Text>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  );
}
