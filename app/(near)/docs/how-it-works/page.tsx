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
import { docMetadata, SOURCE } from "@/lib/near/docs";

export const metadata: Metadata = docMetadata("how-it-works");

const WATERFALL = `payable      = min(total_harm, reserve + allocation)
reserve_draw = min(payable, reserve)
victim_pool  = min(reserve_draw, arbitrated_harm)  -> victims pro rata; rest -> treasury
fee_pool     = min(fee_bps x total_harm, reserve - reserve_draw) -> challengers pro rata
slash        = min(payable - reserve_draw, allocation)
               -> unpaid arbitrated harm first (pro rata), rest -> treasury
allocation - slash stays allocated until the deadline; cert Invalid (halted);
               admitted bonds returned`;

export default function HowItWorks() {
  return (
    <DocArticle slug="how-it-works">
      <P>
        One contract holds the whole protocol. Tokens enter only through NEP-141{" "}
        <C>ft_transfer_call</C> and are credited to an internal balance; inside
        the protocol only internal balances move (reserve, float, stake,
        allocation, bonds, payouts); tokens leave only by <C>withdraw</C>.
        Amounts are mock USDC base units (6 decimals).
      </P>

      <H2 id="lifecycle">The lifecycle at a glance</H2>
      <OL>
        <li>
          <strong>Register.</strong> Every account that holds a balance on Bound
          (operator, auditor, challenger, service) calls <C>storage_deposit</C>{" "}
          (0.01 NEAR). The agent does not need to.
        </li>
        <li>
          <strong>Stake.</strong> The auditor sends mock USDC with{" "}
          <C>ft_transfer_call</C> and msg <C>{`{"stake":{}}`}</C>.
        </li>
        <li>
          <strong>Publish.</strong> The operator calls <C>publish</C> with the
          agent, bound, reserve, expiry, auditor, float cap, optional allowlist
          and optional premium.
        </li>
        <li>
          <strong>Accept.</strong> The agent calls <C>accept</C>. This is its
          consent; a Pending certificate never blocks the agent.
        </li>
        <li>
          <strong>Fund.</strong> The operator funds the reserve and the float
          (by method or by <C>ft_transfer_call</C> msg).
        </li>
        <li>
          <strong>Attest.</strong> The named auditor locks an allocation of its
          free stake behind this one certificate. Status becomes <C>Verified</C>
          .
        </li>
        <li>
          <strong>Confine.</strong> The agent adds a pay-only function-call key
          and deletes its full-access key (see{" "}
          <A href="/docs/key-confinement">Key confinement</A>).
        </li>
        <li>
          <strong>Pay.</strong> The agent spends from the float through{" "}
          <C>pay</C>, metered on every call.
        </li>
        <li>
          <strong>Challenge and settle</strong> if something goes wrong;
          otherwise <strong>release</strong> after the settlement deadline.
        </li>
      </OL>

      <H2 id="publish">Publish and accept</H2>
      <P>
        <C>publish</C> needs 0.05 NEAR attached (excess is refunded) and a
        registered operator. The contract refuses an agent equal to the
        operator, an auditor equal to the operator or the agent, a zero bound or
        reserve, <C>float_cap &gt; bound</C>, an expiry in the past, and an
        allowlist that is empty, longer than 16 or contains the agent. A
        premium, if given, is taken from the operator&apos;s balance now and
        held in escrow.
      </P>
      <P>
        <C>accept</C> is called by the agent with 1 yoctoNEAR. An agent holds
        one live certificate at a time: accepting a new one fails with{" "}
        <C>AgentHasLiveCert</C> while the previous one is still Accepted or
        Verified and before its expiry (or frozen by a claim window).{" "}
        <C>verify(agent)</C> always reports the last certificate the agent
        accepted.
      </P>

      <H2 id="fund">Fund the reserve and the float</H2>
      <UL>
        <li>
          <strong>Reserve.</strong> <C>fund_reserve(cert_id, amount)</C> from
          the operator&apos;s internal balance, or <C>ft_transfer_call</C> with
          msg <C>{`{"reserve":{"cert_id":N}}`}</C>. Allowed while the
          certificate is Pending, Accepted or Verified.
        </li>
        <li>
          <strong>Float.</strong> <C>fund_float(cert_id, amount)</C> or msg{" "}
          <C>{`{"float":{"cert_id":N}}`}</C>. Allowed while Accepted or
          Verified, and never above <C>float_cap</C> (<C>FloatCapExceeded</C>).
          The float is what the agent can actually spend; the operator refills
          it.
        </li>
      </UL>

      <H2 id="attest">Attest and stake</H2>
      <P>
        <C>attest(cert_id, allocation)</C> is called by the auditor named in the
        certificate. It needs the certificate Accepted and not expired,{" "}
        <C>reserve_locked &gt;= reserve_promised</C> (else{" "}
        <C>ReserveUnfunded</C>), <C>allocation &gt;= min_stake</C> and enough
        free stake. The allocation moves from the auditor&apos;s free stake to
        allocated stake. An escrowed premium is paid now: the treasury gets{" "}
        <C>protocol_fee_bps</C> of it (10% on testnet), the auditor the rest.
      </P>

      <H2 id="pay">Pay: float, allowlist, halt</H2>
      <P>
        <C>pay(cert_id, to, amount, memo?)</C> takes no deposit, so a
        function-call key can call it. It is refused, in this order, when:
      </P>
      <Table
        head={["Error", "Condition"]}
        rows={[
          [
            <C key="a">NotAgent</C>,
            "the caller is not the certificate's agent",
          ],
          [<C key="b">CertNotVerified</C>, "the stored status is not Verified"],
          [<C key="c">CertFrozen</C>, "a claim window is open"],
          [
            <C key="d">SettlementDeadlinePassed</C>,
            "now >= expires_at + post_expiry_secs",
          ],
          [
            <C key="e">NotCurrentCert</C>,
            "the agent accepted a newer certificate",
          ],
          [<C key="f">CertHalted</C>, "the operator halted it"],
          [<C key="g">InvalidAmount</C>, "amount is 0"],
          [
            <C key="h">InvalidRecipient</C>,
            "to is the agent itself or the contract",
          ],
          [
            <C key="i">RecipientNotAllowed</C>,
            "an allowlist is set and to is not on it",
          ],
          [
            <C key="j">RecipientNotRegistered</C>,
            "to has no storage_deposit on Bound",
          ],
          [<C key="k">FloatExceeded</C>, "amount > float"],
          [<C key="l">MemoTooLong</C>, "memo over 64 bytes"],
        ]}
      />
      <P>
        A successful payment moves the amount from the float to the
        recipient&apos;s internal balance, adds it to <C>spent</C>, counts{" "}
        <C>pay_count</C>, adds it to <C>post_expiry_spent</C> when it lands
        later than <C>expires_at + grace_secs</C>, and emits a <C>pay</C> event.
        The operator can <C>halt</C> and <C>resume</C> a certificate, and{" "}
        <C>clawback</C> the unspent float, at any time.
      </P>

      <H2 id="challenge">Challenges</H2>
      <P>
        <C>challenge(cert_id, proof, victim?, bond)</C> needs 0.01 NEAR attached
        (excess refunded) and a bond of at least <C>min_challenge_bond</C> from
        the caller&apos;s balance. The operator, agent and auditor cannot
        challenge (<C>ConflictedChallenger</C>) or be named as the victim (
        <C>ConflictedVictim</C>). The victim defaults to the challenger and must
        be registered.
      </P>
      <Table
        head={["Proof", "Kind", "True when"]}
        rows={[
          [
            <C key="a">InsufficientReserve</C>,
            "trustless",
            "reserve_locked < reserve_promised. Structurally false after attest; kept for completeness.",
          ],
          [<C key="b">BoundExceeded</C>, "trustless, hygiene", "spent > bound"],
          [
            <C key="c">ExpiredSpend</C>,
            "trustless, hygiene",
            "post_expiry_spent > de_minimis_bps of bound",
          ],
          [
            <C key="d">{`Harm { claimed, evidence_uri }`}</C>,
            "arbiter",
            "decided by the arbiter; claimed > 0, evidence_uri up to 256 bytes",
          ],
        ]}
      />
      <UL>
        <li>
          A trustless predicate that is false when filed is rejected in the same
          transaction, and its bond goes to the treasury.
        </li>
        <li>
          Any other claim opens the certificate&apos;s claim window (or joins
          it) and freezes the certificate: no <C>pay</C>, no release.
        </li>
        <li>
          A window holds at most 16 claims (<C>WindowFull</C>) and one claim per
          trustless predicate kind (<C>DuplicateClaim</C>).
        </li>
        <li>
          A Verified certificate accepts every kind. A settled (Invalid)
          certificate accepts only Harm claims (<C>NotChallengeable</C>).
        </li>
      </UL>

      <H2 id="window">The claim window</H2>
      <P>
        A new window closes <C>claim_window_secs</C> after it opens (90 s on
        testnet). A claim that arrives with less than a third of a window left
        extends <C>closes_at</C> to now plus a third of a window, so a late
        victim and the arbiter always get time. The extension never moves{" "}
        <C>closes_at</C> past <C>deadline + claim_window_secs</C>.
      </P>
      <P>
        New claims are accepted while <C>now &lt; deadline</C> (the settlement
        deadline, <C>expires_at + post_expiry_secs</C>), or after it only into a
        window that opened before the deadline and is still open.
      </P>
      <P>
        The arbiter decides Harm claims with{" "}
        <C>resolve_by_arbiter(challenge_id, proven, harm)</C>. A proven harm
        must satisfy <C>0 &lt; harm &lt;= claimed</C> and is capped at the
        certificate&apos;s coverage. A rejected claim is settled at once: its
        bond goes to the treasury and its slot in the window is freed.
      </P>

      <H2 id="close-window">close_window and the waterfall</H2>
      <P>
        Anyone may call <C>close_window(cert_id)</C> once{" "}
        <C>now &gt;= closes_at</C> (else <C>WindowOpen</C>). While a Harm claim
        is still undecided, it also waits for the arbiter grace of a third of a
        window after <C>closes_at</C> (<C>ArbiterGrace</C>). Then, in one state
        change:
      </P>
      <UL>
        <li>
          An undecided claim is Unadjudicated: half its bond returns to the
          challenger, half goes to the treasury.
        </li>
        <li>
          A trustless claim whose predicate is no longer true is Cured: its bond
          returns.
        </li>
        <li>
          Every other claim is admitted. With no admitted claim, the window
          simply closes and the certificate is payable again (
          <C>close_window</C> returns null).
        </li>
      </UL>
      <P>
        With arbitrated harm (fraud mode), the settlement waterfall in{" "}
        <A href={SOURCE.settle}>settle.rs</A> runs as one pure function:
      </P>
      <CodeBlock lang="text" title="settlement waterfall" code={WATERFALL} />
      <P>
        The auditor is slashed only for harm the operator&apos;s own reserve
        could not cover, and the slash first tops up arbitrated victims who were
        not paid in full; it never goes to a predicate claimant or a challenger
        fee. In hygiene mode (only true predicates, nobody proven harmed) one
        flat <C>hygiene_bounty</C>, at most the reserve, is split equally
        between the admitted challengers, and the allocation is not slashed.
      </P>
      <P>
        Either way, admitted bonds are returned, the unspent float goes back to
        the operator, and the certificate becomes <C>Invalid</C> and halted. The
        result is stored as the certificate&apos;s <C>settlement</C> and emitted
        as a <C>settle</C> event.
      </P>

      <H3 id="demo-numbers">In the recorded demo</H3>
      <P>
        Cert 0 had reserve 100 and allocation 200. The arbiter upheld a Harm of
        120. Payable was 120: the victim got 100 from the reserve and 20 from
        the auditor&apos;s slash. The challenger fee was 0 because the reserve
        was exhausted, the treasury got 0, and the unslashed 180 stayed
        allocated to the certificate.
      </P>

      <H2 id="review-behaviour">After a settlement</H2>
      <UL>
        <li>
          <strong>Settled certificates stay liable until the deadline.</strong>{" "}
          A settlement halts the certificate for spending but leaves it open to
          Harm claims until <C>expires_at + post_expiry_secs</C>. Later windows
          pay from what is left of the reserve and the allocation.{" "}
          <C>release_reserve</C> on an Invalid certificate waits for the
          deadline, and <C>close_window</C> no longer frees the allocation.
        </li>
        <li>
          <strong>Rejected claims free their slots.</strong> An arbiter-rejected
          claim leaves the window immediately, so 16 junk claims cannot keep a
          real victim out as long as the arbiter acts.
        </li>
        <li>
          <strong>Harm is capped at coverage.</strong> A proven harm above{" "}
          <C>reserve_locked + allocation</C> is capped at it, and the waterfall
          uses a 256-bit <C>mul_div</C>, so a huge harm cannot make{" "}
          <C>close_window</C> panic.
        </li>
        <li>
          A later window that moves no funds keeps the earlier <C>settlement</C>{" "}
          record.
        </li>
      </UL>

      <H2 id="release">Release after the deadline</H2>
      <UL>
        <li>
          <C>release_reserve(cert_id)</C> (operator): before attestation, at any
          time, returning the reserve, the float and an escrowed premium. After
          attestation, only from the settlement deadline on and with no open
          window (<C>Locked</C>, <C>CertFrozen</C>). The certificate becomes{" "}
          <C>Released</C>; if a settlement drew everything it still becomes
          Released and returns 0.
        </li>
        <li>
          <C>release_allocation(cert_id)</C> (auditor): from the deadline on,
          with no open window, the remaining allocation returns to free stake.
          Then <C>unstake</C> moves free stake to the internal balance and{" "}
          <C>withdraw</C> sends it to the token account.
        </li>
      </UL>

      <H2 id="statuses">Statuses in the view</H2>
      <P>
        <C>verify</C> and <C>get_cert</C> compute the status at read time. Act
        only on <C>Verified</C>, and on <C>deal: true</C> if you expect the
        agent to pay you.
      </P>
      <Table
        head={["Status", "Meaning"]}
        rows={[
          [<C key="1">Pending</C>, "published, waiting for the agent"],
          [
            <C key="2">Accepted</C>,
            "accepted, waiting for reserve and attestation",
          ],
          [
            <C key="3">Verified</C>,
            "attested, current, not expired, not halted, no open window",
          ],
          [<C key="4">Halted</C>, "attested but halted by the operator"],
          [
            <C key="5">Expired</C>,
            "past expires_at; pay still works until the deadline, but deal is false",
          ],
          [
            <C key="6">Superseded</C>,
            "the agent accepted a newer certificate; this one cannot pay, but stays challengeable until its deadline",
          ],
          [<C key="7">Challenged</C>, "a claim window is open"],
          [
            <C key="8">Invalid</C>,
            "settled against; still answers Harm claims until the deadline",
          ],
          [<C key="9">Released</C>, "collateral returned"],
        ]}
      />
      <Note>
        <p>
          <C>deal</C> is true only when the status is <C>Verified</C> and the
          float is above 0. It says nothing about the agent&apos;s keys: check
          those separately (<A href="/docs/key-confinement">Key confinement</A>
          ).
        </p>
      </Note>
    </DocArticle>
  );
}
