import type { Metadata } from "next";
import { CodeBlock } from "@/components/near/docs/code-block";
import {
  A,
  C,
  DocArticle,
  H2,
  H3,
  Note,
  P,
  Table,
  UL,
} from "@/components/near/docs/doc";
import { docMetadata, SOURCE } from "@/lib/near/docs";
import {
  DEMO_RUNS,
  NEAR_DEPLOYMENT,
  supersededLabel,
} from "@/lib/near/deployment";

export const metadata: Metadata = docMetadata("deployments");

const d = NEAR_DEPLOYMENT;
const bound = d.contracts.bound;
const token = d.contracts.token;

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-address text-xs [overflow-wrap:anywhere]">
      {children}
    </span>
  );
}

export default function DeploymentsPage() {
  return (
    <DocArticle slug="deployments">
      <P>
        Everything is on NEAR testnet, deployed on {d.deployedAt.slice(0, 10)}{" "}
        by <C>{d.deployer}</C>. The record is{" "}
        <A href={SOURCE.deployment}>near/deployments/testnet.json</A>: account
        ids, deploy transactions, wasm sha256 and on-chain code hashes, and
        every demo run with its transaction hashes. It holds no keys.
      </P>

      <H2 id="accounts">Accounts</H2>
      <Table
        head={["Role", "Account"]}
        rows={[
          ["Bound contract", <C key="b">{bound.accountId}</C>],
          ["Mock USDC token", <C key="t">{token.accountId}</C>],
          ["Treasury", <C key="tr">{d.accounts.treasury}</C>],
          ["Arbiter", <C key="ar">{d.accounts.arbiter}</C>],
          ["Owner / deployer", <C key="o">{d.accounts.owner}</C>],
          [
            "Verified demo agent (cert 1)",
            <C key="a2">bound-agent2-mwfnc6q8.testnet</C>,
          ],
          [
            "Settled demo agent (cert 0)",
            <C key="a1">bound-agent-mwfnc6q8.testnet</C>,
          ],
        ]}
      />
      <P>
        RPC:{" "}
        {d.rpc.map((u, i) => (
          <span key={u}>
            {i > 0 ? ", " : ""}
            <C>{u}</C>
          </span>
        ))}
        . <C>rpc.testnet.near.org</C> now answers every call with a deprecation
        error, so both entries are FastNEAR. Old transactions are looked up on{" "}
        <C>archival-rpc.testnet.fastnear.com</C>, because regular nodes forget
        them after a few epochs.
      </P>

      <H2 id="code">Code</H2>
      <Table
        head={["Contract", "wasm sha256", "code hash (base58)", "bytes"]}
        rows={[bound, token].map((c) => [
          <C key="a">{c.accountId}</C>,
          <Mono key="s">{c.wasmSha256}</Mono>,
          <Mono key="h">{c.codeHash}</Mono>,
          String(c.wasmBytes),
        ])}
      />
      <P>
        The NEAR code hash is the base58 encoding of the wasm&apos;s sha256. The
        build is <C>cargo near build non-reproducible-wasm</C> on the pinned
        toolchain, not a reproducible Docker build: the check is that a local
        build of this commit gives the same sha256 as the deployed code.
      </P>
      <H3 id="verify-wasm">Check the wasm yourself</H3>
      <CodeBlock
        lang="sh"
        title="what runs on chain"
        code={`near account view-account-summary ${bound.accountId} network-config testnet now
# Local Contract (SHA-256 checksum hex)  ${bound.wasmSha256}`}
      />
      <CodeBlock
        lang="sh"
        title="what this commit builds"
        code={`cd near/contracts/bound && cargo near build non-reproducible-wasm
cd ../.. && shasum -a 256 target/near/bound/bound.wasm
# ${bound.wasmSha256}`}
      />
      <P>
        Or let the repository do both: <C>near/scripts/verify.sh</C> rebuilds
        both wasm files and compares them with the record, and{" "}
        <C>pnpm --silent near:status</C> compares the on-chain <C>code_hash</C>{" "}
        with the recorded one. The <A href="/app/near">app</A> shows the same
        comparison live.
      </P>

      <H2 id="config">Configuration</H2>
      <P>
        Demo timers keep the whole lifecycle inside minutes: claim window{" "}
        {d.config.claim_window_secs} s, post-expiry {d.config.post_expiry_secs}{" "}
        s, grace {d.config.grace_secs} s. Production defaults would be 72 h, 7 d
        and 24 h. The full table is in the{" "}
        <A href="/docs/contract#config">contract reference</A>, and{" "}
        <C>get_config</C> returns the live values.
      </P>

      <H2 id="runs">Recorded demo runs</H2>
      <P>
        Each run is committed as <C>near/evidence/near-demo-&lt;run&gt;.txt</C>{" "}
        (human) and <C>.json</C> (machine). <C>pnpm --silent near:evidence</C>{" "}
        re-checks every recorded transaction hash on an archival node, and each
        run page here does the same.
      </P>
      <Table
        head={["Run", "Contract", "Started", "Transactions", "Result"]}
        rows={DEMO_RUNS.map((r) => [
          <A key="r" href={`/app/near/run/${r.runId}`}>
            <span className="font-address">{r.runId}</span>
          </A>,
          r.superseded ? (
            <span key="c">
              <C>{supersededLabel(r)}</C> (superseded)
            </span>
          ) : (
            <span key="c">
              <C>{r.contract.split(".")[0]}</C> (current)
            </span>
          ),
          r.startedAt.replace("T", " ").slice(0, 16),
          String(r.steps.filter((s) => s.hash).length),
          r.pass ? "all steps as expected" : "see run page",
        ])}
      />
      <P>
        MCP agent runs are recorded beside them as{" "}
        <C>mcp-agent-&lt;run&gt;.txt</C> and <C>.json</C>: <C>mwfnc6q8</C> on
        the current contract, <C>mwfiv11v</C> and <C>mwfgqr0u</C> on the
        superseded ones. See <A href={SOURCE.evidence}>near/evidence</A>.
      </P>

      <H2 id="superseded">Superseded contracts</H2>
      <P>
        Two earlier deployments are left running exactly as they were, so their
        evidence stays checkable. Do not use them.
      </P>
      <Table
        head={["Contract", "Live", "Why it was replaced"]}
        rows={d.previous.map((p) => [
          <C key="a">{p.accountId}</C>,
          `${p.deployedAt.slice(0, 16).replace("T", " ")} to ${p.supersededAt.slice(0, 16).replace("T", " ")}`,
          p.accountId.startsWith("bound-v1")
            ? "Truncated u64 certificate ids to u32. Cert id 2^32 aliased cert 0 but opened its own claim window, and closing that window unfroze cert 0 while the real one was open. Fixed in bound-v2."
            : "Ran the code from before the second review's fixes. In its run mwfiv11v the unslashed allocation went back to the auditor at close_window; on bound-v3 it stays allocated until the settlement deadline.",
        ])}
      />
      <UL>
        <li>
          bound-v1 runs: <C>mwfgi0ij</C>, <C>mwfgqr0u</C> (and MCP run{" "}
          <C>mwfgqr0u</C>). Its certificates 0 to 2 came from two early
          development runs that failed part way, before the evidence format
          existed. They hold no evidence and are not part of the demo.
        </li>
        <li>
          bound-v2 run: <C>mwfiv11v</C> (and MCP run <C>mwfiv11v</C>).
        </li>
        <li>
          The current contract, bound-v3, starts from cert 0 with run{" "}
          <C>mwfnc6q8</C>.
        </li>
      </UL>
      <Note>
        <p>
          The evidence log of <C>mwfnc6q8</C> counts certificates by ordinal and
          calls the second one &quot;cert 2&quot;; its on-chain id is 1, as the{" "}
          <C>verify</C> on the next line of the log shows.
        </p>
      </Note>
    </DocArticle>
  );
}
