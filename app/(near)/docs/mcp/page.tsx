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
import { NEAR_SNIPPETS } from "@/lib/near/links";

export const metadata: Metadata = docMetadata("mcp");

export default function McpPage() {
  return (
    <DocArticle slug="mcp">
      <P>
        The <C>bound-near</C> MCP server gives an LLM agent the same checks a
        service makes, plus a metered way to pay. It runs on stdio and keeps
        stdout pure JSON-RPC.
      </P>

      <H2 id="config">Client config</H2>
      <P>
        For Claude Desktop, Cursor and any other client that launches stdio
        servers:
      </P>
      <CodeBlock lang="json" title="mcp config" code={NEAR_SNIPPETS.mcp} />
      <P>
        To let the agent pay, pass its pay-only key in the server&apos;s env:
      </P>
      <CodeBlock
        lang="json"
        title="mcp config with near_pay enabled"
        code={`{
  "mcpServers": {
    "bound-near": {
      "command": "npx",
      "args": ["-y", "@bound/near", "mcp"],
      "env": {
        "BOUND_NEAR_AGENT_ID": "<agent>.testnet",
        "BOUND_NEAR_AGENT_KEY": "ed25519:<function-call private key>"
      }
    }
  }
}`}
      />
      <Note tone="warn">
        <p>
          Use only the agent&apos;s function-call key here, never a full-access
          key. NEAR lets that key call only <C>pay</C> on the Bound contract, so
          even a prompt-injected model holding it can at worst spend the float,
          and only to recipients the operator allowlisted.
        </p>
      </Note>

      <H2 id="tools">Tools</H2>
      <Table
        head={["Tool", "Input", "Read-only"]}
        rows={[
          [
            <C key="1">near_verify_agent</C>,
            <C key="1i">{`{ agent }`}</C>,
            "yes",
          ],
          [
            <C key="2">near_get_certificate</C>,
            <C key="2i">{`{ cert_id }`}</C>,
            "yes",
          ],
          [
            <C key="3">near_check_agent_keys</C>,
            <C key="3i">{`{ agent }`}</C>,
            "yes",
          ],
          [
            <C key="4">near_pay</C>,
            <C key="4i">{`{ cert_id, to, amount, memo? }`}</C>,
            "no; needs the agent key env",
          ],
        ]}
      />
      <P>
        <C>agent</C> and <C>to</C> must be NEAR account ids. <C>amount</C> is a
        decimal USDC string with up to 6 decimals, such as{" "}
        <C>&quot;2.5&quot;</C>. <C>memo</C> is at most 64 characters. Results
        are JSON text; a failure comes back with <C>isError: true</C> and{" "}
        <C>Error: ...</C>.
      </P>

      <H3 id="near-verify-agent">near_verify_agent</H3>
      <P>
        Calls <C>verify(agent)</C> and returns{" "}
        <C>{`{ agent, deal, reason, certificate }`}</C>. Amounts in{" "}
        <C>certificate</C> are formatted as USDC: <C>cert_id</C>, <C>status</C>,{" "}
        <C>agent</C>, <C>operator</C>, <C>auditor</C>, <C>bound</C>,{" "}
        <C>reserve_locked</C>, <C>reserve_promised</C>,{" "}
        <C>auditor_allocation</C>, <C>coverage</C>, <C>coverage_note</C>,{" "}
        <C>spent</C>, <C>float</C>, <C>float_cap</C>, <C>allowlist</C>,{" "}
        <C>halted</C>, <C>expires_at</C> and <C>claim_window_closes_at</C> (ISO
        times), <C>settlement</C>, <C>unit</C>. Deal only when <C>deal</C> is
        true.
      </P>
      <H3 id="near-get-certificate">near_get_certificate</H3>
      <P>
        Calls <C>get_cert(cert_id)</C> and returns the same formatted
        certificate, or an error when there is none.
      </P>
      <H3 id="near-check-agent-keys">near_check_agent_keys</H3>
      <P>
        Reads the access keys and the code fields of the account. Returns{" "}
        <C>agent</C>, <C>contract</C>, <C>confined</C>, <C>keys_confined</C>,{" "}
        <C>code_hash</C>, <C>global_contract_hash</C>,{" "}
        <C>global_contract_account_id</C>, <C>no_contract_code</C>,{" "}
        <C>no_local_code</C>, <C>global_contract</C> and the raw <C>keys</C>.
        Call it together with <C>near_verify_agent</C>: the contract cannot
        check confinement itself.
      </P>
      <H3 id="near-pay">near_pay</H3>
      <P>
        Signs <C>pay</C> with the agent key and returns{" "}
        <C>{`{ ok, tx, explorer, error, logs }`}</C>. The contract&apos;s
        refusal text comes back in <C>error</C>, for example{" "}
        <C>FloatExceeded</C> or <C>RecipientNotAllowed</C>. Without the env
        variables it returns an error saying <C>near_pay</C> is disabled.
      </P>

      <H2 id="recorded-run">A recorded run</H2>
      <P>
        <C>near/evidence/mcp-agent-mwfnc6q8.txt</C> records an agent driving
        these tools against cert 1: it confined itself to a pay-only key, paid 1
        to the allowlisted service, was refused with <C>FloatExceeded</C> for
        500 and with <C>RecipientNotAllowed</C> for the treasury,{" "}
        <C>near_check_agent_keys</C> reported it confined, and its float dropped
        by exactly 1. Every write (the key swap and the three payments) has a
        transaction; the reads are plain view calls. No language model runs in
        that script: the calls are the exact tool calls an LLM agent holding
        that key could make, so a prompt-injected model is refused the same way.
        See <A href={SOURCE.evidence}>near/evidence</A>.
      </P>

      <H2 id="embed">Embed it</H2>
      <P>
        <C>createNearMcpServer</C> returns an <C>McpServer</C> from{" "}
        <C>@modelcontextprotocol/sdk</C>; add that package to your own
        dependencies to import a transport.
      </P>
      <CodeBlock
        lang="ts"
        code={`import { createNearMcpServer } from "@bound/near/mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = createNearMcpServer({
  contractId: "bound-v3.boundproto-nh26.testnet", // default
  // rpc, provider, agentId, agentKey are optional
});
await server.connect(new StdioServerTransport());`}
      />
      <UL>
        <li>
          From a clone of the repository: <C>pnpm --silent near:mcp</C>, with
          client config{" "}
          <C>{`{"command": "pnpm", "args": ["--silent", "--dir", "<repo>", "near:mcp"]}`}</C>
          .
        </li>
        <li>
          <C>pnpm --silent near:mcp-smoke</C> connects a client in-process and
          calls every read tool against testnet.
        </li>
      </UL>
    </DocArticle>
  );
}
