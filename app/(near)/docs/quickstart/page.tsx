import type { Metadata } from "next";
import { CodeBlock } from "@/components/near/docs/code-block";
import {
  A,
  C,
  DocArticle,
  H2,
  H3,
  Note,
  OL,
  P,
  UL,
} from "@/components/near/docs/doc";
import { docMetadata } from "@/lib/near/docs";
import { NEAR_GITHUB_URL, NEAR_SNIPPETS } from "@/lib/near/links";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = docMetadata("quickstart");

const AGENT = "bound-agent2-mwfnc6q8.testnet";
const SETTLED = "bound-agent-mwfnc6q8.testnet";

export default function Quickstart() {
  return (
    <DocArticle slug="quickstart">
      <P>
        Two demo agents are live on testnet. <C>{AGENT}</C> holds cert 1, left{" "}
        <C>Verified</C> until 2026-11-30. <C>{SETTLED}</C> holds cert 0, which
        was settled against in the demo and reads <C>Invalid</C>. Every read
        below needs no NEAR account and no key.
      </P>

      <H2 id="web">1. In the browser</H2>
      <P>
        Open <A href="/app/near">the app</A> and paste an agent account into the
        verify box. The page shows the verdict, coverage, the agent&apos;s key
        and code confinement, claims and, for a settled certificate, the
        settlement waterfall.
      </P>

      <H2 id="cli">2. From a terminal</H2>
      <P>Node.js 20 or later. Nothing to install first:</P>
      <CodeBlock lang="sh" code={NEAR_SNIPPETS.verify} />
      <P>
        It prints the certificate, coverage (reserve plus auditor allocation),
        confinement and a decision, and exits <C>0</C> for deal. Try the settled
        agent to see a refusal (exit <C>2</C>):
      </P>
      <CodeBlock lang="sh" code={`npx @bound/near verify ${SETTLED}`} />
      <P>
        Add <C>--json</C> for machine-readable output. See{" "}
        <A href="/docs/cli">CLI</A>.
      </P>

      <H2 id="http">3. Over HTTP</H2>
      <CodeBlock lang="sh" code={`curl ${SITE_URL}/api/near/verify/${AGENT}`} />
      <P>
        The answer is JSON with <C>deal</C>, <C>reason</C>, the raw certificate
        view and the confinement check, read fresh from testnet and sent with{" "}
        <C>cache-control: no-store</C> (check <C>cert.now</C> for freshness).
        See <A href="/docs/http-api">HTTP API</A>.
      </P>

      <H2 id="mcp">4. From an LLM agent (MCP)</H2>
      <P>
        Add the server to any MCP client that launches stdio servers (Claude
        Desktop, Cursor and similar):
      </P>
      <CodeBlock lang="json" title="mcp config" code={NEAR_SNIPPETS.mcp} />
      <P>
        Then ask the model to verify <C>{AGENT}</C>. It calls{" "}
        <C>near_verify_agent</C> and <C>near_check_agent_keys</C>. See{" "}
        <A href="/docs/mcp">MCP server</A>.
      </P>

      <H2 id="library">5. In code</H2>
      <CodeBlock lang="sh" code={NEAR_SNIPPETS.install} />
      <CodeBlock
        lang="ts"
        code={`import { fmtUsdc, verifyAgent } from "@bound/near";

const r = await verifyAgent("${AGENT}");
if (r.deal && r.confinement?.confined) {
  console.log(\`deal: coverage \${fmtUsdc(r.coverage)} USDC\`);
} else {
  console.log(\`refuse: \${r.reason}\`);
}`}
      />

      <H2 id="repo">Run it from the repository</H2>
      <P>
        Prerequisites: Rust through rustup (the pinned 1.95.0 toolchain installs
        itself), <C>cargo-near</C> 0.23, Node.js 22 and pnpm 10. Clone the{" "}
        <A href={NEAR_GITHUB_URL}>near-hackathon branch</A> and run everything
        from the repository root.
      </P>
      <CodeBlock lang="sh" code={`pnpm install --frozen-lockfile`} />

      <H3 id="offline">Offline: the full lifecycle in tests</H3>
      <CodeBlock lang="sh" code={`cd near && cargo test`} />
      <P>
        Expect <C>132 passed</C> (unit), then <C>2 passed</C> (near-sandbox:{" "}
        <C>full_lifecycle_settles_victim</C>,{" "}
        <C>withdraw_failure_recredits_and_guards_hold</C>), then <C>4 passed</C>{" "}
        (mock token). The first run downloads the sandbox binary.
      </P>

      <H3 id="all-checks">Every check at once</H3>
      <CodeBlock lang="sh" code={`near/scripts/verify.sh`} />
      <P>
        Builds both wasm files, runs fmt, clippy, all tests, the TypeScript
        typecheck and vitest, checks that the built wasm sha256 equals the
        deployed one, then runs <C>near:status</C> and <C>near:evidence</C>. It
        ends with <C>== all checks passed</C>.
      </P>

      <H3 id="reads">Zero-secret testnet reads</H3>
      <CodeBlock
        lang="sh"
        code={`pnpm --silent near:status        # contract ids, on-chain code_hash == recorded, get_config, cert count
pnpm --silent near:verify ${AGENT}
pnpm --silent near:verify ${SETTLED}   # exit 2 on purpose: refuse
pnpm --silent near:evidence      # re-checks every recorded tx hash on an archival node
pnpm --silent near:mcp-smoke     # MCP client calls every read tool (8 checks)`}
      />
      <P>
        Use <C>--silent</C> so pnpm does not add its own lines. Without it, the
        settled agent&apos;s exit code 2 shows up as <C>ELIFECYCLE</C>, which
        only reports the exit code.
      </P>

      <H3 id="demo">Replay the demo on testnet</H3>
      <CodeBlock lang="sh" code={`pnpm near:demo --fresh`} />
      <UL>
        <li>
          <C>pnpm near:demo</C> on the canonical deployment needs the arbiter
          key, which only the author has.
        </li>
        <li>
          <C>--fresh</C> creates a new deployer account and deploys a private
          copy. Its arbiter is <C>arbiter.&lt;deployer&gt;</C>, with the key
          saved in your own <C>~/.near-credentials/testnet</C>, so you decide
          its claims.
        </li>
        <li>
          When the public faucet rate-limits, the script creates actors through
          the <C>testnet</C> registrar funded by <C>--funder &lt;account&gt;</C>
          . Pass your own account with a key in{" "}
          <C>~/.near-credentials/testnet</C> (about 10 testnet NEAR for{" "}
          <C>--fresh</C>).
        </li>
      </UL>
      <P>The demo runs eight acts and asserts every balance change:</P>
      <OL>
        <li>Actors are created, mock USDC is minted, storage is registered.</li>
        <li>
          The auditor stakes; the operator publishes, the agent accepts, reserve
          and float are funded, the auditor attests.
        </li>
        <li>
          The agent swaps its full-access key for a pay-only key, then pays a
          service through the gate.
        </li>
        <li>
          A scripted attack: over-float and off-allowlist payments fail on
          chain, other actions are refused by NEAR, then the operator halts.
        </li>
        <li>
          A false <C>BoundExceeded</C> claim is rejected in the same
          transaction.
        </li>
        <li>The service files a Harm claim; the arbiter upholds it.</li>
        <li>
          Anyone closes the window; the victim is paid from the reserve, then
          the slash.
        </li>
        <li>A second certificate is left Verified for judging.</li>
      </OL>
      <Note>
        <p>
          The recorded run of this demo is <C>mwfnc6q8</C>. Each step and its
          transaction is on <A href="/app/near/run/mwfnc6q8">its run page</A>,
          re-checked against an archival node.
        </p>
      </Note>
    </DocArticle>
  );
}
