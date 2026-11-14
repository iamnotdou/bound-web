import type { Metadata } from "next";
import { clsx } from "clsx";
import { Text } from "@/components/navy/text";
import {
  A,
  C,
  CardLinks,
  DocArticle,
  H2,
  Note,
  P,
  Table,
  UL,
} from "@/components/near/docs/doc";
import { docMetadata } from "@/lib/near/docs";
import { BOUND_CONTRACT, TOKEN_CONTRACT } from "@/lib/near/deployment";

export const metadata: Metadata = docMetadata("");

function Box({
  title,
  lines,
  accent,
  className,
}: {
  title: string;
  lines: string[];
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "border-border flex flex-col border-b border-r p-6",
        accent && "bg-inverse",
        className,
      )}
    >
      <Text
        tag="p"
        variant="textBase"
        className={clsx(
          "my-0 font-medium wrap-anywhere",
          accent ? "text-inverse-foreground" : "text-foreground",
        )}
      >
        {title}
      </Text>
      <ul
        className={clsx(
          "mt-3 mb-0 flex list-none flex-col gap-1 pl-0 text-sm *:my-0 *:pl-0",
          accent ? "text-inverse-foreground/75" : "text-muted-foreground",
        )}
      >
        {lines.map((l) => (
          <li key={l} className="wrap-anywhere">
            {l}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Who calls what on the one Bound contract, as a hairline grid. */
function ActorsDiagram() {
  return (
    <figure className="my-8">
      <div className="border-border grid border-l border-t sm:grid-cols-2">
        <Box
          accent
          className="sm:col-span-2"
          title={`Bound contract (${BOUND_CONTRACT})`}
          lines={[
            "certificate per agent",
            "reserve_locked (operator USDC)",
            "allocation (auditor stake)",
            "float + allowlist + halt: the spend meter",
            "claim window + settlement waterfall",
            "coverage = reserve_locked + allocation",
          ]}
        />
        <Box
          title="Operator"
          lines={[
            "publish",
            "fund_reserve / fund_float",
            "halt / resume",
            "release_reserve",
          ]}
        />
        <Box
          title="Auditor"
          lines={[
            "stake (ft_transfer_call)",
            "attest(allocation)",
            "release_allocation",
          ]}
        />
        <Box
          title="Agent (pay-only key, no code)"
          lines={["accept", "pay(cert_id, to, amount)"]}
        />
        <Box
          title="Counterparty / service"
          lines={[
            "verify(agent) + key and code check",
            "challenge (Harm claim)",
            "withdraw",
          ]}
        />
        <Box title="Arbiter" lines={["resolve_by_arbiter"]} />
      </div>
      <figcaption className="text-muted-foreground mt-4 text-sm text-pretty">
        Every actor talks to one contract. Mock USDC ({TOKEN_CONTRACT}) enters
        only by <C>ft_transfer_call</C> and leaves only by <C>withdraw</C>;
        inside, only internal balances move. Anyone may call <C>close_window</C>{" "}
        once a window has closed.
      </figcaption>
    </figure>
  );
}

export default function DocsOverview() {
  return (
    <DocArticle slug="">
      <P>
        Bound lets a counterparty check what stands behind an AI agent before
        dealing with it. On NEAR, three things back the agent: a USDC reserve
        the operator pre-funds, an auditor&apos;s slashable stake locked to that
        one certificate, and a spend meter that the agent&apos;s NEAR key cannot
        get around.
      </P>
      <P>
        A single view call, <C>verify(agent)</C>, returns the agent&apos;s
        certificate with <C>coverage = reserve_locked + allocation</C>. That is
        the most that victims upheld by the arbiter can recover in total. If the
        agent causes harm, a claim window opens, and one atomic settlement pays
        the victim from the reserve first and then from the auditor&apos;s slash
        for whatever the reserve could not cover.
      </P>

      <Note tone="warn" title="Testnet only">
        <p>
          Everything here runs on NEAR testnet with a mock USDC token that
          anyone can mint. The arbiter, the treasury and the full-access keys of
          the Bound and mock USDC contracts are held by the author. A
          certificate proves committed capital, not good behaviour. See{" "}
          <A href="/docs/trust-model">Trust model and limits</A>.
        </p>
      </Note>

      <H2 id="actors">Actors</H2>
      <ActorsDiagram />
      <Table
        head={["Actor", "What it does"]}
        rows={[
          [
            "Operator",
            "Runs the agent. Publishes the certificate, funds the reserve and the float, sets the recipient allowlist, can halt spending.",
          ],
          [
            "Agent",
            "A named NEAR account. Accepts the certificate, then spends only through pay with a function-call key scoped to that one method.",
          ],
          [
            "Auditor",
            "Stakes mock USDC and locks part of it (the allocation) behind one certificate by attesting. Slashed only for harm the reserve could not cover.",
          ],
          [
            "Counterparty",
            "A service or another agent. Reads verify(agent) and the agent's keys and code before extending credit, and files a Harm claim if harmed.",
          ],
          [
            "Arbiter",
            "One named account that decides Harm claims (proven or not, and how much).",
          ],
          [
            "Treasury",
            "Receives the protocol share of the premium, forfeited bonds and any slash left after victims are paid.",
          ],
        ]}
      />

      <H2 id="why-near">What NEAR adds</H2>
      <UL>
        <li>
          <strong>Protocol-level key confinement.</strong> The agent deletes its
          full-access key and keeps one function-call key for <C>pay</C> on the
          Bound contract. NEAR itself refuses every other action before any
          contract runs. See <A href="/docs/key-confinement">Key confinement</A>
          .
        </li>
        <li>
          <strong>Named accounts.</strong>{" "}
          <C>verify(&quot;bound-agent2-mwfnc6q8.testnet&quot;)</C> is readable
          by a person and by an agent, and the certificate names its operator,
          auditor and agent by account id.
        </li>
        <li>
          <strong>NEP-141 custody and NEP-297 events.</strong> Every <C>pay</C>{" "}
          emits{" "}
          <C>
            EVENT_JSON:{"{"}
            &quot;standard&quot;:&quot;bound&quot;,...,&quot;event&quot;:&quot;pay&quot;
            {"}"}
          </C>
          , which a service reads from RPC as a payment receipt.
        </li>
        <li>
          <strong>One contract, one receipt.</strong> NEAR cross-contract calls
          are asynchronous, so the registry, reserve, staking, payment router
          and claims live in one contract and settlement is a single state
          change. The only outgoing promise is <C>withdraw</C>.
        </li>
      </UL>

      <H2 id="numbers">The number to rely on</H2>
      <P>
        <C>coverage</C>, not <C>bound</C>. <C>bound</C> is a spend meter:{" "}
        <C>spent</C> is gross routed flow and can pass the bound by refilling
        the float, which is what the <C>BoundExceeded</C> predicate catches. The
        live demo certificate (cert 1) has bound 50, reserve 30 and allocation
        100, so its coverage is 130 mUSDC. A service that extends credit should
        cap it at <C>min(bound, coverage)</C> minus what it is already owed,
        which is what the demo gate does.
      </P>

      <H2 id="next">Where to go next</H2>
      <CardLinks
        items={[
          {
            href: "/docs/quickstart",
            title: "Quickstart",
            body: "Verify an agent in a minute: web, CLI, HTTP or MCP.",
          },
          {
            href: "/docs/how-it-works",
            title: "How it works",
            body: "The certificate lifecycle and the settlement waterfall.",
          },
          {
            href: "/docs/contract",
            title: "Contract reference",
            body: "Every method, its caller, deposit and errors.",
          },
          {
            href: "/docs/sdk",
            title: "SDK",
            body: "@bound/near for TypeScript services.",
          },
        ]}
      />
    </DocArticle>
  );
}
