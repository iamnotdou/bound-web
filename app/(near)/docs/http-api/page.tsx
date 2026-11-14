import type { Metadata } from "next";
import { CodeBlock } from "@/components/near/docs/code-block";
import { C, DocArticle, H2, Note, P, Table } from "@/components/near/docs/doc";
import { docMetadata } from "@/lib/near/docs";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = docMetadata("http-api");

const AGENT = "bound-agent2-mwfnc6q8.testnet";

const SCHEMA = `{
  network: "testnet",
  contract: string,            // the Bound contract read
  agent: string,               // lowercased account id
  deal: boolean,               // Verified, not halted, and the contract's deal flag
  reason: string,              // human-readable why
  cert: CertView | null,       // verify(agent), as the contract returns it
  confinement: {               // null when the keys could not be read
    confined: boolean,         // pay-only keys AND no code, local or global
    keysConfined: boolean,
    codeHash: string | null,   // null when view_account could not be read
    globalContract: string | null,
    fullAccess: number,        // count of full-access keys
    functionCall: Array<{
      publicKey: string,
      receiver: string,
      methods: string[],
      allowanceNear: string | null   // e.g. "0.249"
    }>,
    summary: string
  } | null
}`;

const EXAMPLE = `{
  "network": "testnet",
  "contract": "bound-v3.boundproto-nh26.testnet",
  "agent": "bound-agent2-mwfnc6q8.testnet",
  "deal": true,
  "reason": "Verified: reserve locked and auditor staked",
  "cert": {
    "cert_id": 1,
    "status": "Verified",
    "deal": true,
    "operator": "bound-operator-mwfnc6q8.testnet",
    "agent": "bound-agent2-mwfnc6q8.testnet",
    "auditor": "bound-auditor-mwfnc6q8.testnet",
    "bound": "50000000",
    "reserve_promised": "30000000",
    "reserve_locked": "30000000",
    "allocation": "100000000",
    "coverage": "130000000",
    "premium": "0",
    "float": "9000000",
    "float_cap": "10000000",
    "spent": "1000000",
    "post_expiry_spent": "0",
    "pay_count": 1,
    "allowlist": ["bound-service-mwfnc6q8.testnet"],
    "expires_at": 1795996800,
    "settlement_deadline": 1795997100,
    "halted": false,
    "window_closes_at": null,
    "open_claims": 0,
    "settlement": null,
    "now": 1794657572
  },
  "confinement": {
    "confined": true,
    "keysConfined": true,
    "codeHash": "11111111111111111111111111111111",
    "globalContract": null,
    "fullAccess": 0,
    "functionCall": [
      {
        "publicKey": "ed25519:7y9HVKPeXorjxfuV35HGLTqqVXoaNCs5ZgddRAiuQgoh",
        "receiver": "bound-v3.boundproto-nh26.testnet",
        "methods": ["pay"],
        "allowanceNear": "0.249"
      }
    ],
    "summary": "Confined: its only key is a function-call key for bound-v3.boundproto-nh26.testnet, method pay, no full-access key, no contract code and no global contract"
  }
}`;

export default function HttpApiPage() {
  return (
    <DocArticle slug="http-api">
      <P>
        One read-only endpoint, served by this site. No key, no wallet, no auth.
        Responses carry <C>cache-control: no-store</C>: a verdict is about now,
        and a cached deal after a claim window opens is the exact failure a
        certificate exists to prevent.
      </P>
      <CodeBlock lang="http" code={`GET /api/near/verify/<agent>`} />
      <CodeBlock
        lang="sh"
        code={`curl -s ${SITE_URL}/api/near/verify/${AGENT}`}
      />

      <H2 id="status-codes">Status codes</H2>
      <Table
        head={["Status", "Body", "When"]}
        rows={[
          [
            <C key="1">200</C>,
            "the verdict below",
            "the contract answered; cert may be null (no certificate)",
          ],
          [
            <C key="2">400</C>,
            <C key="2b">{`{ "error": "not a NEAR account id" }`}</C>,
            "the path segment is not a valid account id",
          ],
          [
            <C key="3">502</C>,
            <C key="3b">{`{ "error": "testnet RPC did not answer; no verdict" }`}</C>,
            "the RPC failed: no verdict rather than a wrong one",
          ],
        ]}
      />

      <H2 id="schema">Response schema</H2>
      <CodeBlock lang="ts" title="200 body" code={SCHEMA} />
      <P>
        <C>cert</C> is the contract&apos;s <C>CertView</C>; its fields are
        listed in the contract reference. Amounts are decimal strings in mock
        USDC base units (6 decimals), times unix seconds.
      </P>

      <H2 id="example">Example</H2>
      <P>Cert 1 as read on 2026-11-14. Live values change as the agent pays.</P>
      <CodeBlock lang="json" code={EXAMPLE} />

      <H2 id="deciding">Deciding</H2>
      <P>
        Extend credit only when <C>deal</C> and <C>confinement.confined</C> are
        both true, and cap it at <C>min(bound, coverage)</C> minus what the
        agent already owes you. Treat a <C>null</C> confinement or a 502 as a
        refusal.
      </P>
      <Note>
        <p>
          <C>deal</C> here uses the same rule as the SDK and the CLI. It does
          not include confinement; <C>confinement</C> is reported beside it.
        </p>
      </Note>
    </DocArticle>
  );
}
