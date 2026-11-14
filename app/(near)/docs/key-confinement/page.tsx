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
  Table,
  UL,
} from "@/components/near/docs/doc";
import { docMetadata } from "@/lib/near/docs";
import { BOUND_CONTRACT } from "@/lib/near/deployment";

export const metadata: Metadata = docMetadata("key-confinement");

const AGENT = "bound-agent2-mwfnc6q8.testnet";
const RPC = "https://test.rpc.fastnear.com";

export default function KeyConfinement() {
  return (
    <DocArticle slug="key-confinement">
      <P>
        A spend meter only matters if the agent cannot route around it. On NEAR,
        an account can hold function-call access keys that are limited to one
        receiver contract and a list of methods, and that can never attach a
        deposit. Bound uses that to confine the agent at the protocol level:
        NEAR itself refuses everything else the key tries, before any contract
        runs.
      </P>

      <H2 id="setup">How the agent is confined</H2>
      <OL>
        <li>The agent accepts its certificate with its full-access key.</li>
        <li>
          It adds a function-call key with receiver <C>{BOUND_CONTRACT}</C>,
          methods <C>[&quot;pay&quot;]</C> and a 0.25 NEAR gas allowance.
        </li>
        <li>It deletes its full-access key.</li>
      </OL>
      <P>
        <C>pay</C> is the only mutating method that takes no deposit, which is
        what lets a function-call key call it. Every other mutating method needs
        1 yoctoNEAR or a storage deposit, so the key cannot reach it.
      </P>
      <P>What NEAR refuses, as recorded in act 4 of the demo:</P>
      <Table
        head={["The key tries", "NEAR answers"]}
        rows={[
          [
            <span key="a">
              <C>ft_transfer</C> on the token (needs 1 yocto)
            </span>,
            <C key="a2">AccessKeyDepositWithFunctionCallActionError</C>,
          ],
          [
            <span key="b">
              <C>mint</C> on the token (no deposit)
            </span>,
            <C key="b2">AccessKeyReceiverMismatchActionError</C>,
          ],
          [
            <span key="c">
              <C>withdraw</C> on Bound (needs 1 yocto)
            </span>,
            <C key="c2">AccessKeyDepositWithFunctionCallActionError</C>,
          ],
          [
            "send 0.01 NEAR",
            <C key="d2">AccessKeyRequiresFullAccessActionError</C>,
          ],
        ]}
      />
      <P>
        These produce no transaction at all. Payments the key can make are still
        checked by the contract: over the float fails with <C>FloatExceeded</C>,
        off the allowlist with <C>RecipientNotAllowed</C>, after a halt with{" "}
        <C>CertHalted</C>.
      </P>

      <H2 id="code">Keys are only half of it</H2>
      <P>
        Contract code deployed on the agent account runs with the agent as
        predecessor and needs no key at all. It could call <C>pay</C>, call{" "}
        <C>ft_transfer</C> on the token, or add a full-access key to its own
        account. An account that uses a NEAR global contract reports a{" "}
        <C>code_hash</C> of all ones, like an account with no code, and names
        the global code in <C>global_contract_hash</C> or{" "}
        <C>global_contract_account_id</C>; that code runs as the agent too. So
        confined means all of:
      </P>
      <UL>
        <li>
          every access key is a function-call key to the Bound contract with
          methods exactly <C>[&quot;pay&quot;]</C> (and there is at least one
          key);
        </li>
        <li>
          <C>view_account(agent).code_hash</C> is{" "}
          <C>11111111111111111111111111111111</C> (no contract code);
        </li>
        <li>
          <C>global_contract_hash</C> and <C>global_contract_account_id</C> are
          both null or absent (no global contract).
        </li>
      </UL>
      <Note tone="warn" title="verify(agent) does not prove confinement">
        <p>
          The Bound contract cannot read another account&apos;s keys or code. A
          counterparty reads <C>verify(agent)</C> and both RPC views. The CLI,
          the SDK&apos;s <C>verifyAgent</C>, the MCP tool{" "}
          <C>near_check_agent_keys</C>, the HTTP API and the app all do this for
          you.
        </p>
      </Note>
      <P>
        With no full-access key and no code, the key cannot be widened: adding a
        key needs a full-access key or code on the account. The agent account
        can never be recovered after its full-access key is deleted. That is the
        point, and it is why the demo agents are throwaway accounts.
      </P>

      <H2 id="check-yourself">Check it yourself</H2>
      <H3 id="near-cli">With near-cli-rs</H3>
      <CodeBlock
        lang="sh"
        code={`near account list-keys ${AGENT} network-config testnet now
near account view-account-summary ${AGENT} network-config testnet now`}
      />
      <P>
        <C>list-keys</C> should show exactly one key, permitted to{" "}
        <C>only do [&quot;pay&quot;] function calls on {BOUND_CONTRACT}</C>. The
        summary should say <C>Contract: No contract code</C> and{" "}
        <C>0 full access keys and 1 function-call-only access keys</C>.
      </P>
      <H3 id="rpc">With raw JSON-RPC</H3>
      <P>
        The summary does not print the global contract fields, so read{" "}
        <C>view_account</C> directly as well:
      </P>
      <CodeBlock
        lang="sh"
        code={`curl -s ${RPC} -H 'content-type: application/json' -d '{
  "jsonrpc": "2.0", "id": 1, "method": "query",
  "params": {"request_type": "view_access_key_list", "finality": "final",
             "account_id": "${AGENT}"}
}'

curl -s ${RPC} -H 'content-type: application/json' -d '{
  "jsonrpc": "2.0", "id": 1, "method": "query",
  "params": {"request_type": "view_account", "finality": "final",
             "account_id": "${AGENT}"}
}'`}
      />
      <P>
        Expect one key whose permission is <C>FunctionCall</C> with{" "}
        <C>receiver_id</C> <C>{BOUND_CONTRACT}</C> and <C>method_names</C>{" "}
        <C>[&quot;pay&quot;]</C>, a <C>code_hash</C> of all ones, and no
        non-null <C>global_contract_*</C> field.
      </P>
      <H3 id="tools">With the Bound tools</H3>
      <CodeBlock
        lang="sh"
        code={`npx @bound/near verify ${AGENT}
# confinement: confined (1 key(s), no contract code, no global contract)`}
      />

      <H2 id="residual">What the key can still do</H2>
      <UL>
        <li>
          Call <C>pay</C> on any certificate; the contract rejects every one
          where the caller is not the agent.
        </li>
        <li>
          Spend its 0.25 NEAR gas allowance on failing calls, which only griefs
          its own account.
        </li>
        <li>
          Pay up to the current float to an allowlisted recipient. This is the
          residual risk: a hijacked agent can drain the float to an allowlisted
          counterparty. It is capped by <C>float_cap</C> and stopped by the
          operator&apos;s <C>halt</C>. With no allowlist, the float can go to
          any registered account.
        </li>
      </UL>
      <P>
        See <A href="/docs/trust-model">Trust model and limits</A> for what else
        a certificate does not cover.
      </P>
    </DocArticle>
  );
}
