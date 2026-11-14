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
import { NEAR_NPM_URL, NEAR_SNIPPETS } from "@/lib/near/links";

export const metadata: Metadata = docMetadata("sdk");

export default function SdkPage() {
  return (
    <DocArticle slug="sdk">
      <P>
        <A href={NEAR_NPM_URL}>@bound/near</A> 0.1.0 is an ESM package for
        Node.js 20 or later, built on near-api-js 7.5.3. The testnet deployment
        ships inside it, so there is nothing to configure. Reads need no NEAR
        account and no key. Source: <A href={SOURCE.pkg}>packages/near</A>.
      </P>
      <CodeBlock lang="sh" code={NEAR_SNIPPETS.install} />
      <Table
        head={["Entry", "What"]}
        rows={[
          [
            <C key="1">@bound/near</C>,
            "read client, confinement check, pure helpers, write helpers, TESTNET",
          ],
          [
            <C key="2">@bound/near/mcp</C>,
            "createNearMcpServer (see MCP server)",
          ],
          [
            <C key="3">@bound/near/testnet.json</C>,
            "the bundled deployment as JSON",
          ],
          [<C key="4">bound-near</C>, "the CLI binary (see CLI)"],
        ]}
      />

      <H2 id="verify">Gate a request on a certificate</H2>
      <CodeBlock
        lang="ts"
        code={`import { fmtUsdc, verifyAgent } from "@bound/near";

const r = await verifyAgent("bound-agent2-mwfnc6q8.testnet");

if (r.deal && r.confinement?.confined) {
  console.log(\`deal: coverage \${fmtUsdc(r.coverage)} USDC on \${r.contract}\`);
} else {
  console.log(\`refuse: \${r.reason}\`);
}`}
      />
      <P>
        <C>verifyAgent(agent, opts?)</C> reads <C>verify(agent)</C> and the
        agent&apos;s keys and code, and returns an <C>AgentVerdict</C>:
      </P>
      <CodeBlock
        lang="ts"
        code={`interface AgentVerdict {
  agent: string;
  contract: string;
  /** Deal only when true: Verified, not halted, float > 0. */
  deal: boolean;
  reason: string;              // "Verified", or why not
  certificate: CertViewJson | null;
  /** reserve_locked + auditor allocation, USDC base units (0 without a cert). */
  coverage: bigint;
  /** Null when the account does not exist or could not be read. */
  confinement: Confinement | null;
}`}
      />
      <Note tone="warn">
        <p>
          <C>deal</C> is the contract&apos;s verdict and does not include
          confinement. Check <C>confinement?.confined</C> too, as in the
          example.
        </p>
      </Note>

      <H2 id="options">Options</H2>
      <CodeBlock
        lang="ts"
        code={`interface ReadOptions {
  provider?: Provider;   // a near-api-js Provider; wins over rpc
  rpc?: string[];        // RPC URLs, tried in order (default: bundled FastNEAR testnet)
  contractId?: string;   // default: bound-v3.boundproto-nh26.testnet
}`}
      />

      <H2 id="reads">Reads</H2>
      <H3 id="certificates">Certificates</H3>
      <CodeBlock
        lang="ts"
        code={`import { TESTNET, getAgentCertificate, getCertificate } from "@bound/near";

const current = await getAgentCertificate("bound-agent2-mwfnc6q8.testnet"); // verify(agent)
const settled = await getCertificate(TESTNET.demo.settledCertId);           // get_cert(0)
console.log(settled?.status, settled?.settlement);`}
      />
      <P>
        Both return <C>CertViewJson | null</C>: the contract&apos;s view with
        amounts as decimal strings.
      </P>
      <H3 id="confinement">Confinement</H3>
      <CodeBlock
        lang="ts"
        code={`import { checkConfinement } from "@bound/near";

const c = await checkConfinement("bound-agent2-mwfnc6q8.testnet");
// c.confined        every key pay-only for the contract AND no code, local or global
// c.keysConfined    the keys alone
// c.noContractCode  code_hash all ones and no global contract
// c.noLocalCode     code_hash all ones
// c.globalContract  the global contract hash or account, or null
// c.code, c.keys    the raw view_account fields and view_access_key_list`}
      />

      <H2 id="helpers">Pure helpers</H2>
      <P>No network; unit tested.</P>
      <Table
        head={["Export", "Does"]}
        rows={[
          [
            <C key="a">assess(view)</C>,
            "{ ok, reason }: ok only for Verified, not halted, and not deal=false",
          ],
          [
            <C key="b">coverageOf(view)</C>,
            "bigint coverage (reserve_locked + allocation)",
          ],
          [
            <C key="c">isConfined(keys, contractId, code)</C>,
            "keysConfined and hasNoCode",
          ],
          [
            <C key="d">keysConfined(keys, contractId)</C>,
            "every key a FunctionCall to contractId with methods only pay",
          ],
          [
            <C key="e">hasNoCode(code)</C>,
            "code_hash all ones and no global contract",
          ],
          [
            <C key="f">globalContractOf(code)</C>,
            "global contract hash or account id, or null",
          ],
          [
            <C key="g">describeCert(view), describeCode(code)</C>,
            "one-line summaries (the CLI prints these)",
          ],
          [<C key="h">usdc(&quot;12.5&quot;)</C>, "12500000n (base units)"],
          [<C key="i">fmtUsdc(12500000n)</C>, '"12.5"'],
          [
            <C key="j">parseEvents(logs), payEvents(logs)</C>,
            "NEP-297 bound events from transaction logs",
          ],
          [
            <C key="k">explorerTx(hash), explorerAccount(id)</C>,
            "testnet NearBlocks links",
          ],
          [<C key="l">NO_CODE_HASH, USDC_DECIMALS, USDC</C>, "constants"],
        ]}
      />

      <H2 id="payment-receipt">Read a payment receipt</H2>
      <CodeBlock
        lang="ts"
        code={`import { payEvents } from "@bound/near";

// logs: the receipt logs of the agent's pay transaction
for (const p of payEvents(logs)) {
  console.log(p.cert_id, p.agent, "->", p.to, p.amount, p.memo);
}`}
      />

      <H2 id="low-level">Low-level client</H2>
      <UL>
        <li>
          <C>testnetProvider(urls?)</C>: a near-api-js{" "}
          <C>FailoverRpcProvider</C> over <C>TESTNET_RPCS</C>.{" "}
          <C>TESTNET_ARCHIVAL_RPCS</C> puts an archival node first for old
          transactions.
        </li>
        <li>
          <C>view(provider, contractId, method, args)</C>: a view call at{" "}
          <C>final</C>, tried up to 3 times (<C>withRetry</C>).
        </li>
        <li>
          <C>accountCodeOf</C>, <C>codeHashOf</C>, <C>chainNow</C> (final block
          time in seconds).
        </li>
        <li>
          <C>call(account, contractId, method, args, {"{ deposit?, gas? }"})</C>{" "}
          sends one function call and waits for FINAL. It never auto-resends. It
          returns a <C>TxOutcome</C> (<C>hash</C>, <C>url</C>, <C>ok</C>,{" "}
          <C>error</C>, <C>logs</C>, <C>value</C>) rather than throwing for an
          on-chain failure. <C>tryCall</C> also turns a submission refusal (no
          transaction created, for example a function-call key refused by NEAR)
          into <C>ok: false, hash: null</C>.
        </li>
        <li>
          <C>accountFromKey(provider, accountId, key)</C> builds an{" "}
          <C>Account</C> from a key you pass. The package never reads key files.
        </li>
        <li>
          <C>quietRpcRetryLogs()</C> is opt-in: it drops the stack traces
          near-api-js prints on each failed retry. Importing the library patches
          nothing.
        </li>
      </UL>
      <CodeBlock
        lang="ts"
        title="the agent pays (pay-only key)"
        code={`import { TESTNET, accountFromKey, testnetProvider, tryCall, usdc } from "@bound/near";

const provider = testnetProvider();
const agent = accountFromKey(provider, process.env.AGENT_ID!, process.env.AGENT_KEY as never);
const o = await tryCall(agent, TESTNET.contracts.bound.accountId, "pay", {
  cert_id: 1,
  to: "bound-service-mwfnc6q8.testnet",
  amount: usdc("1").toString(),
  memo: null,
});
console.log(o.ok ? o.url : o.error); // e.g. "FloatExceeded: amount ... > float ..."`}
      />

      <H2 id="testnet">TESTNET</H2>
      <CodeBlock
        lang="ts"
        code={`import { TESTNET } from "@bound/near";

TESTNET.contracts.bound.accountId  // "bound-v3.boundproto-nh26.testnet"
TESTNET.contracts.bound.codeHash   // "A3yf1yzihbUdZAaHn92aAm5dBAdFCq1QCwhBJixD2B4H"
TESTNET.contracts.token.accountId  // "usdc.boundproto-nh26.testnet"
TESTNET.accounts                   // { treasury, arbiter, owner }
TESTNET.rpc                        // FastNEAR testnet endpoints
TESTNET.demo                       // { runId: "mwfnc6q8", verifiedAgent, verifiedCertId: 1, settledAgent, settledCertId: 0 }`}
      />
    </DocArticle>
  );
}
