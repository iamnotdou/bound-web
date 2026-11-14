import type { Metadata } from "next";
import {
  A,
  C,
  DocArticle,
  H2,
  Note,
  P,
  Table,
  UL,
} from "@/components/near/docs/doc";
import { docMetadata, SOURCE } from "@/lib/near/docs";
import { NEAR_DEPLOYMENT } from "@/lib/near/deployment";

export const metadata: Metadata = docMetadata("trust-model");

const acc = NEAR_DEPLOYMENT.accounts;
const BOUND = NEAR_DEPLOYMENT.contracts.bound.accountId;

export default function TrustModelPage() {
  return (
    <DocArticle slug="trust-model">
      <Note
        tone="warn"
        title="This is a testnet demo trust model, not a production one"
      >
        <p>
          One person, the author, holds every trusted role: the arbiter, the
          treasury and the full-access keys of the Bound and mock USDC
          contracts.
        </p>
        <p>
          &ldquo;Bonded and insured&rdquo; is an analogy. Bound is a surety bond
          (the operator&apos;s reserve) plus staked cover (the auditor&apos;s
          allocation), paid only to victims whose claim the arbiter upholds, up
          to the coverage. It is not a regulated insurance product and does not
          promise that every loss is covered.
        </p>
      </Note>

      <H2 id="roles">Trusted roles</H2>
      <Table
        head={["Role", "Account", "What it could do", "Roadmap"]}
        rows={[
          [
            "Arbiter",
            <C key="a">{acc.arbiter}</C>,
            "Decides Harm claims. Could uphold a fake claim naming a colluding victim and drain any certificate up to its coverage.",
            "A per-certificate arbiter named at publish, or a Sputnik DAO arbiter.",
          ],
          [
            "Treasury",
            <C key="t">{acc.treasury}</C>,
            "Receives the protocol fee, forfeited bonds and slash left after victims are paid.",
            "A DAO-held treasury.",
          ],
          [
            "Contract key",
            <C key="k">{BOUND}</C>,
            "Keeps the deployer's full-access keys on the Bound and mock USDC accounts during judging so a bug can be fixed by deploying to a fresh account. Those keys could replace the code.",
            "Delete the key or hand it to a DAO.",
          ],
        ]}
      />
      <P>
        You can check that the code on chain is the code in the repository: see{" "}
        <A href="/docs/deployments#verify-wasm">Check the wasm yourself</A>. The
        configuration has no setters; <C>get_config</C> returns the values fixed
        at init.
      </P>

      <H2 id="what-a-cert-means">What a certificate means</H2>
      <UL>
        <li>
          <strong>It proves committed capital, not good behaviour.</strong>{" "}
          Victims upheld by the arbiter are paid up to{" "}
          <C>coverage = reserve + allocation</C>, shared pro rata by every
          arbitrated victim of the certificate.
        </li>
        <li>
          <strong>Spend is not loss.</strong> <C>spent</C> is gross routed flow.{" "}
          <C>bound</C> is a meter, and <C>spent</C> can pass it by refilling the
          float.
        </li>
        <li>
          <strong>Credit across services can be oversubscribed.</strong> Each
          service limits its own credit by <C>min(bound, coverage)</C>, but two
          services that each extend that much share one coverage pool.
        </li>
        <li>
          <strong>Only the current certificate can pay.</strong>{" "}
          <C>verify(agent)</C> returns the agent&apos;s last accepted
          certificate. An older one reads <C>Superseded</C> and cannot spend,
          but stays challengeable until its own settlement deadline; read it
          with <C>get_cert</C> or <C>list_certs</C>.
        </li>
        <li>
          <strong>An expired certificate is not a deal.</strong> From{" "}
          <C>expires_at</C> on, the view reads <C>Expired</C> with{" "}
          <C>deal=false</C>, while <C>pay</C> still works until the settlement
          deadline and is metered as post-expiry spend.
        </li>
      </UL>

      <H2 id="not-protected">Not protected</H2>
      <UL>
        <li>Harm the arbiter cannot assess off chain.</li>
        <li>
          The float drained to allowlisted recipients by a hijacked agent. It is
          capped by <C>float_cap</C> and stopped by <C>halt</C> (see{" "}
          <A href="/docs/key-confinement#residual">Key confinement</A>).
        </li>
        <li>Storage deposits, which are not refundable in this version.</li>
        <li>
          Value: mock USDC has an open <C>mint</C>. It is play money.
        </li>
      </UL>

      <H2 id="limitations">Known limitations</H2>
      <UL>
        <li>
          <strong>Slot squatting depends on the arbiter.</strong> Freeing a
          squatted claim slot depends on the arbiter rejecting the junk claim in
          time. An arbiter that does not act leaves the slots full until the
          window closes, and after the deadline that still locks a late victim
          out. With an idle arbiter, 16 undecided claims cost the attacker only
          16 half-bonds (80 USDC with the demo config).
        </li>
        <li>
          <strong>Refile race.</strong> A rejection frees its slot, but the
          attacker can refile into it in the same block, ahead of the victim.
          Each cycle costs one forfeited bond, yet a determined attacker can
          keep a late victim out until the window closes, at the latest{" "}
          <C>deadline + claim_window_secs</C>. A real fix (a bond that grows
          with the number of claims, or a slot held for claims after a
          rejection) is out of scope for the hackathon build.
        </li>
        <li>
          <strong>Hygiene bounty.</strong> It goes to whoever files the true
          predicate, which can be the operator&apos;s own sybil. It is paid from
          the operator&apos;s own reserve, so it is cost-neutral to the
          operator, and it no longer ends any liability.
        </li>
        <li>
          <strong>One settlement record.</strong> A certificate settled more
          than once keeps only the latest <C>Settlement</C> that moved funds in
          its view; the <C>settle</C> events carry every one. In hygiene mode{" "}
          <C>auditor_returned</C> reports the allocation that stays locked,
          although nothing is returned at that point.
        </li>
        <li>
          <strong>Conservation is not property-tested.</strong> It is proven for
          the pure waterfall, by one contract-level test across several windows
          and releases, and by hand review of the other paths, not by a property
          test over random call sequences.
        </li>
        <li>
          <strong>New view values.</strong> <C>Halted</C>, <C>Superseded</C> and{" "}
          <C>deal</C>. A client that acts only on <C>Verified</C> already treats
          them as do not deal; a client that looks for specific bad statuses has
          to learn the two new ones.
        </li>
        <li>
          <strong>Demo timers.</strong> 90 s claim window and 300 s post-expiry,
          so the demo runs in minutes.
        </li>
        <li>
          <strong>Gas allowance.</strong> When the agent key&apos;s allowance
          runs out, the agent cannot pay; the operator issues a new agent
          account and certificate.
        </li>
      </UL>
      <P>
        Source: <A href={SOURCE.design}>DESIGN.md</A>, sections 7, 8 and 10.
      </P>
    </DocArticle>
  );
}
