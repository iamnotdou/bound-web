import type { Metadata } from "next";
import { Band } from "@/components/navy/gradient-hero";
import { Cta } from "@/components/near-landing/cta";
import { Developers } from "@/components/near-landing/developers";
import { Hero } from "@/components/near-landing/hero";
import { HowItWorks } from "@/components/near-landing/how-it-works";
import { Numbers } from "@/components/near-landing/numbers";
import { Problem } from "@/components/near-landing/problem";
import { Proof } from "@/components/near-landing/proof";
import { TrustModel } from "@/components/near-landing/trust-model";
import { WhyNear } from "@/components/near-landing/why-near";
import { getCert, getDeploymentFacts } from "@/lib/near/bound";
import { BOUND_CONTRACT, findRun } from "@/lib/near/deployment";
import { NEAR_RUN_ID } from "@/lib/near/links";

// Same cadence as /app/near: the live numbers are chain facts that are the
// same for every visitor, so a short-lived cached shell is honest.
export const revalidate = 15;

const title = "Bound on NEAR: bonded and insured AI agents";
const description =
  "The bond-and-insurance layer for AI agents on NEAR: a locked reserve and an auditor's slashable stake pay the people an agent harms, and one view call shows the cover. Live on NEAR testnet.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    title,
    description,
    url: "/",
    siteName: "Bound on NEAR",
    type: "website",
  },
  twitter: { card: "summary_large_image", title, description },
};

const RUN = findRun(NEAR_RUN_ID);
const VERIFIED_CERT = RUN?.cert2Id ?? 1;
const VERIFIED_AGENT = RUN?.actors.agent2 ?? "bound-agent2-mwfnc6q8.testnet";
const RUN_TXS = RUN ? RUN.steps.filter((s) => s.hash).length : 37;
const RUN_ASSERTS = RUN ? RUN.asserts.length : 36;

/**
 * The NEAR landing page, laid out as Navy's landing: gradient hero, live
 * numbers, the problem, how it works, a shader band, why NEAR as a card
 * row, proof, developers, the trust model and a closing call to action.
 */
export default async function NearHome() {
  const [facts, cert] = await Promise.all([
    getDeploymentFacts(),
    getCert(VERIFIED_CERT),
  ]);
  const view = cert.ok ? cert.value : null;
  const bound = facts.contracts.find((c) => c.accountId === BOUND_CONTRACT);

  return (
    <div className="overflow-x-clip">
      <Hero agent={VERIFIED_AGENT} />
      <Numbers
        certId={VERIFIED_CERT}
        agent={VERIFIED_AGENT}
        view={view}
        readFailed={!cert.ok}
        certCount={facts.certCount}
      />
      <Problem />
      <HowItWorks />
      <Band />
      <WhyNear />
      <Proof
        codeHashMatches={bound?.matches ?? null}
        txs={RUN_TXS}
        asserts={RUN_ASSERTS}
      />
      <Developers />
      <TrustModel />
      <Cta />
    </div>
  );
}
