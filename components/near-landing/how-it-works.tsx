import Link from "next/link";
import { ArrowLink } from "@/components/navy/arrow-link";
import { Section } from "@/components/navy/section";
import { Text } from "@/components/navy/text";
import { Term } from "@/components/near-landing/term";
import { NEAR_RUN_ID, NEAR_RUN_PATH } from "@/lib/near/links";

/** Navy's HowItWorks: a heading and eight short steps on a four-up grid. */
const steps: { title: string; text: React.ReactNode }[] = [
  {
    title: "Operator",
    text: "Publishes a certificate for its agent naming a bound, a reserve, a float cap, an allowlist of recipients and an expiry, then funds it.",
  },
  {
    title: "Agent",
    text: (
      <>
        Accepts the certificate once, then swaps its full-access key for a
        function-call key that can only call <Term>pay</Term> on the Bound
        contract.
      </>
    ),
  },
  {
    title: "Auditor",
    text: "Attests the certificate by locking part of its own stake behind it, and earns the premium, less the 10% protocol fee.",
  },
  {
    title: "Reserve",
    text: "Pre-funded by the operator and locked in the contract. Arbitrated victims are paid from it first.",
  },
  {
    title: "Slashable stake",
    text: "The auditor's allocation tops up what the reserve could not cover. Coverage is reserve plus allocation.",
  },
  {
    title: "Spend meter",
    text: (
      <>
        Every <Term>pay</Term> is limited by the float and recorded in{" "}
        <Term>spent</Term>; when the operator sets an allowlist, only those
        recipients can be paid. Bound is a meter, not a guarantee.
      </>
    ),
  },
  {
    title: "Claim window",
    text: (
      <>
        Filing a claim opens a claim window and freezes payments. The arbiter
        rules on harm claims inside it; once it closes, anyone calls{" "}
        <Term>close_window</Term> and the certificate settles.
      </>
    ),
  },
  {
    title: "Settlement waterfall",
    text: (
      <>
        Run {NEAR_RUN_ID}: a 120 mUSDC harm was paid in full, 100 from the
        reserve and 20 slashed from the auditor. The auditor&apos;s other 180
        was not touched.
      </>
    ),
  },
];

export function HowItWorks() {
  return (
    <Section aria-labelledby="how-heading" label="How it works">
      <Text
        tag="h2"
        id="how-heading"
        variant="displayMD"
        className="text-foreground max-w-xl tracking-tight text-balance"
      >
        Three parties, one certificate, a <em>fixed waterfall</em>
      </Text>
      <Text
        tag="p"
        variant="textBase"
        className="text-muted-foreground mt-4 max-w-xl text-pretty"
      >
        One NEAR contract holds the money and the rules. The arithmetic fraud
        proofs are checked by the contract itself; a harm claim is decided by a
        disclosed arbiter.
      </Text>
      <div className="mt-16 grid gap-x-10 gap-y-24 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <div key={step.title}>
            <Text
              tag="h3"
              variant="textBase"
              className="text-foreground font-medium"
            >
              {step.title}
            </Text>
            <Text
              tag="p"
              variant="textSM"
              className="text-muted-foreground mt-2 text-pretty"
            >
              {step.text}
            </Text>
            {step.title === "Settlement waterfall" && (
              <ArrowLink asChild className="mt-4">
                <Link href={NEAR_RUN_PATH}>See the run</Link>
              </ArrowLink>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}
