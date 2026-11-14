import type { Metadata } from "next";
import { CodeBlock } from "@/components/near/docs/code-block";
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
import { docMetadata } from "@/lib/near/docs";

export const metadata: Metadata = docMetadata("cli");

export default function CliPage() {
  return (
    <DocArticle slug="cli">
      <P>
        <C>bound-near</C> ships with <C>@bound/near</C>. Run it with{" "}
        <C>npx @bound/near</C>, or install the package and call{" "}
        <C>bound-near</C>. It needs no key.
      </P>
      <CodeBlock
        lang="text"
        title="bound-near --help"
        code={`Usage
  bound-near verify <agent.testnet> [--json]   deal or refuse, coverage, confinement
  bound-near cert <id> [--json]                read one certificate
  bound-near mcp                               MCP server over stdio

Options
  --contract <id>   Bound contract (default bound-v3.boundproto-nh26.testnet)
  --rpc <url>       RPC endpoint, repeatable (default https://test.rpc.fastnear.com, https://rpc.testnet.fastnear.com)
  --json            machine-readable output
  -h, --help        this help
  -v, --version     print the version

Exit codes: 0 deal / found, 2 refuse / not found, 1 error.`}
      />

      <H2 id="verify">verify</H2>
      <CodeBlock
        lang="sh"
        code={`npx @bound/near verify bound-agent2-mwfnc6q8.testnet`}
      />
      <CodeBlock
        lang="text"
        title="output (shortened)"
        code={`bound-agent2-mwfnc6q8.testnet: cert 1 Verified | ... | coverage 130 | spent 1 float 9/10 | ...
  coverage 130 USDC = reserve 30 + auditor allocation 100 (...)
  confinement: confined (1 key(s), no contract code, no global contract)
  decision: deal (Verified)`}
      />
      <P>
        It reads the agent&apos;s current certificate, prints it on one line,
        then the coverage split, the confinement check, the settlement if there
        is one, and the decision. The decision follows the contract&apos;s
        verdict (Verified, not halted, float above 0); confinement is printed
        beside it for you to weigh.
      </P>
      <P>
        With <C>--json</C> it prints the whole <C>AgentVerdict</C> from{" "}
        <A href="/docs/sdk#verify">verifyAgent</A>, with bigints as strings.
      </P>

      <H2 id="cert">cert</H2>
      <CodeBlock lang="sh" code={`npx @bound/near cert 0`} />
      <P>
        Reads <C>get_cert</C>, prints the one-line summary, coverage, halted and
        the settlement. <C>--json</C> prints the raw view (or <C>null</C>).
      </P>

      <H2 id="mcp">mcp</H2>
      <CodeBlock lang="sh" code={`npx -y @bound/near mcp`} />
      <P>
        Starts the MCP server on stdio. stdout carries JSON-RPC only. It runs
        until stdin closes. See <A href="/docs/mcp">MCP server</A>.
      </P>

      <H2 id="exit-codes">Exit codes</H2>
      <Table
        head={["Code", "verify", "cert"]}
        rows={[
          [<C key="0">0</C>, "deal", "found"],
          [
            <C key="2">2</C>,
            "refuse (no certificate, not Verified, halted or no float)",
            "no such certificate",
          ],
          [
            <C key="1">1</C>,
            "error (bad arguments, RPC failure)",
            "error (non-numeric id, RPC failure)",
          ],
        ]}
      />
      <CodeBlock
        lang="sh"
        title="use it in a script"
        code={`if npx -y @bound/near verify "$AGENT" > /dev/null; then
  echo "serve on credit"
else
  echo "refuse or prepay"
fi`}
      />

      <H2 id="options">Options</H2>
      <UL>
        <li>
          <C>--contract &lt;id&gt;</C> points at another Bound deployment, for
          example a private copy made with <C>pnpm near:demo --fresh</C>.
        </li>
        <li>
          <C>--rpc &lt;url&gt;</C> can repeat (or take a comma-separated list);
          URLs are tried in order.
        </li>
        <li>
          Set <C>BOUND_NEAR_DEBUG=1</C> to see the RPC retry stack traces the
          CLI hides by default.
        </li>
      </UL>
      <Note>
        <p>
          From a clone of the repository,{" "}
          <C>pnpm --silent near:verify &lt;agent&gt;</C> runs the same check
          from source.
        </p>
      </Note>
    </DocArticle>
  );
}
