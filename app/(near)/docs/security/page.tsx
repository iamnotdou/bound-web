import type { Metadata } from "next";
import {
  A,
  C,
  DocArticle,
  H2,
  H3,
  P,
  Table,
  UL,
} from "@/components/near/docs/doc";
import { docMetadata, SOURCE } from "@/lib/near/docs";

export const metadata: Metadata = docMetadata("security");

const CHECKLIST: [string, string][] = [
  [
    "ft_on_transfer only from the configured token",
    "ft_on_transfer_from_other_token_rejected, sandbox",
  ],
  [
    "msg parse error panics so the token refunds",
    "ft_on_transfer_bad_msg_panics_so_token_refunds, sandbox",
  ],
  [
    "unregistered beneficiary refunded, no state created",
    "ft_on_transfer_refunds_unregistered_beneficiary, sandbox",
  ],
  [
    "withdraw debits before the promise, callback re-credits on failure",
    "withdraw_debits_before_promise, sandbox withdraw_failure_recredits_and_guards_hold",
  ],
  [
    "withdraw requires 1 yocto and >= 30 Tgas",
    "withdraw_without_yocto_rejected, withdraw_with_low_gas_rejected",
  ],
  [
    "every mutating method needs 1 yocto or its storage deposit, except pay, ft_on_transfer and the private callback",
    "accept_without_yocto_rejected, *_deposit_too_small_rejected",
  ],
  [
    "roles checked with predecessor_account_id, never signer_account_id",
    "grep finds no signer_account_id in lib.rs",
  ],
  [
    "checked u128 arithmetic, overflow-checks = true in release",
    "near/Cargo.toml",
  ],
  [
    "no unbounded iteration: list_certs limit <= 50, <= 16 claims per window",
    "list_certs_paginates, seventeenth_claim_rejected",
  ],
  [
    "storage deposits cover actual usage",
    "storage_deposit_covers_usage and the runtime StorageNotCovered check",
  ],
  ["no admin setters; config immutable", "no setter exists; get_config"],
  [
    "pay cannot take a deposit, so a function-call key can call it",
    "near-sdk rejects a deposit on non-payable methods",
  ],
];

export default function SecurityPage() {
  return (
    <DocArticle slug="security">
      <P>
        The contract was reviewed before submission in several rounds. Every
        contract fix has a regression test in{" "}
        <A href={SOURCE.tests}>src/tests.rs</A> that failed on the reviewed code
        and passes now. The full write-up is{" "}
        <A href={SOURCE.design}>DESIGN.md</A>, section 10 (review fixes) and
        section 6 (checklist). The test suite is 120 unit tests in{" "}
        <C>tests.rs</C>, 12 in <C>settle.rs</C>, 2 near-sandbox tests and 4 for
        the mock token.
      </P>

      <H2 id="checklist">Checklist</H2>
      <Table
        head={["Item", "Where it is checked"]}
        rows={CHECKLIST.map(([a, b]) => [
          a,
          <span
            key="b"
            className="font-address text-xs [overflow-wrap:anywhere]"
          >
            {b}
          </span>,
        ])}
      />

      <H2 id="first-review">First review: fixed in bound-v2</H2>
      <P>
        <strong>Certificate id aliasing.</strong> bound-v1 truncated u64 ids to
        u32. Cert id <C>2^32</C> resolved to cert 0 but opened its own claim
        window, and closing that alias window unfroze cert 0 while the real
        window was still open, so collateral could leave before an upheld victim
        was paid. It also bypassed the 16-claim cap. Now any id above{" "}
        <C>u32::MAX</C> is <C>NoSuchCert</C> / <C>NoSuchChallenge</C>, and
        frozen means a window exists for the certificate&apos;s own stored id.
      </P>
      <P>
        The same round added the claim-window griefing defences:{" "}
        <C>ConflictedChallenger</C>, half the bond forfeited for an
        unadjudicated claim, the late-claim extension and the arbiter grace in{" "}
        <C>close_window</C>.
      </P>

      <H2 id="second-review">Second review: fixed in bound-v3</H2>
      <H3 id="c1">C1, major: the operator could end its liability early</H3>
      <P>
        With no allowlist, the agent could loop the float through an operator
        sybil until <C>spent &gt; bound</C>; the sybil filed{" "}
        <C>BoundExceeded</C>, and the hygiene settlement released the reserve
        and the allocation at once, so later victims got <C>NotChallengeable</C>
        . Now:
      </P>
      <UL>
        <li>
          a settlement halts the certificate for spending but leaves it open to
          Harm claims until the deadline;
        </li>
        <li>
          <C>release_reserve</C> on an Invalid certificate waits for the
          deadline, and <C>close_window</C> no longer frees the allocation;
        </li>
        <li>
          trustless predicates are refused on a settled certificate, so the
          hygiene bounty cannot be drawn twice.
        </li>
      </UL>
      <H3 id="c2">C2, major: claim-slot squatting at the deadline</H3>
      <P>
        Sixteen minimum-bond Harm claims filed just before the deadline filled
        the only window, rejected claims kept their slots, and the real victim
        was locked out. Now an arbiter-rejected claim leaves the window at once,
        a claim after the deadline is still accepted into a window that opened
        before it and is still open, and a window takes one claim per predicate
        kind.
      </P>
      <H3 id="minor">Minor findings</H3>
      <UL>
        <li>
          <strong>Harm overflow.</strong> Proven harm is capped at coverage, and
          the waterfall uses a 256-bit <C>mul_div</C>, exact for every u128
          input.
        </li>
        <li>
          <strong>Empty second settlement.</strong> A window that moves no funds
          keeps the earlier settlement record.
        </li>
        <li>
          <strong>Client verdict.</strong> <C>assess()</C> follows the
          contract&apos;s <C>deal</C> flag, so a Verified certificate with float
          0 is not a deal.
        </li>
        <li>
          <strong>Deadline boundary.</strong> Release needs{" "}
          <C>now &gt;= deadline</C>; challenge and pay need{" "}
          <C>now &lt; deadline</C> (or, for a claim, the open pre-deadline
          window).
        </li>
        <li>
          <strong>Conflicted victim.</strong> The victim may not be the
          operator, agent or auditor (<C>ConflictedVictim</C>).
        </li>
        <li>
          <strong>Excess deposit.</strong> NEAR attached to <C>publish</C> or{" "}
          <C>challenge</C> above the requirement is refunded.
        </li>
        <li>
          <strong>Halted view.</strong> Status reads <C>Halted</C> while halted,
          and <C>deal</C> is true only for Verified with float above 0.
        </li>
        <li>
          <strong>Superseded certificate.</strong> <C>pay</C> refuses any
          certificate other than the one <C>verify</C> reports (
          <C>NotCurrentCert</C>).
        </li>
      </UL>
      <H3 id="round-two">Second round of that review</H3>
      <UL>
        <li>
          <strong>Post-deadline extension capped.</strong> <C>closes_at</C>{" "}
          never moves past <C>deadline + claim_window_secs</C>, so
          reject-and-refile cannot freeze collateral forever. With a Harm claim
          undecided, collateral stays frozen until at most{" "}
          <C>deadline + claim_window_secs + claim_window_secs/3</C>.
        </li>
        <li>
          <strong>Emptied certificate.</strong> When a settlement drew the whole
          reserve and the float was 0, <C>release_reserve</C> now marks the
          certificate Released and returns 0.
        </li>
        <li>
          <strong>Conservation test.</strong> <C>conservation_across_windows</C>{" "}
          checks that balances, stake, reserve, float, premium and pending bonds
          add up at every step.
        </li>
      </UL>

      <H2 id="third-review">Third review: documentation and tests only</H2>
      <P>
        No blocker or major issue. Its minor findings are behaviours of the
        deployed code, now written down and pinned by tests; the built wasm
        still hashes to the recorded bound-v3 value.
      </P>
      <UL>
        <li>
          A claim into an expired but not yet closed window joins it and extends
          it under the same rule and cap.
        </li>
        <li>
          From <C>expires_at</C> on, the view reads <C>Expired</C> with{" "}
          <C>deal=false</C> while <C>pay</C> still works until the deadline.
        </li>
        <li>
          Summing 16 capped harms overflows only above <C>u128::MAX / 16</C>{" "}
          coverage, which a 6-decimal token cannot reach.
        </li>
      </UL>
      <P>
        What remains open is listed under{" "}
        <A href="/docs/trust-model#limitations">Known limitations</A>.
      </P>
    </DocArticle>
  );
}
