"use client";

import { useId, useState } from "react";
import { Gavel, Loader2, TriangleAlert } from "lucide-react";
import { isAccountId } from "@/components/app/stellar-address";
import { Button } from "@/components/ui/button";
import {
  asId,
  useWalletActions,
  WalletActionError,
  type ActionStage,
} from "@/lib/wallet/use-wallet-actions";
import { useWallet } from "@/lib/wallet/wallet-provider";
import { cn } from "@/lib/utils";

const STAGE_TITLE: Record<ActionStage, string> = {
  connect: "No wallet connected",
  build: "The challenge could not be built",
  sign: "The challenge was not signed",
  submit: "The network rejected the challenge",
};

const STAGE_HINT: Record<ActionStage, string> = {
  connect: "Connect a wallet in the header, then open the challenge again.",
  build:
    "Nothing was signed and no bond was posted. The message above is the contract's own: the challenge would have failed on-chain.",
  sign: "Nothing was sent and no bond was posted.",
  submit:
    "The challenge was signed but did not land. Your bond was not taken. Check before retrying, in case it landed after all.",
};

/**
 * The proofs a browser can file unaided.
 *
 * All three are decided by arithmetic over state the contracts already hold,
 * which is what lets the contract rule on them in the filing transaction
 * itself. `FakeSignature` is deliberately absent: a forged attestation leaves
 * no on-chain trace to read, so it waits on an arbiter, and offering it here
 * would put a claim nobody can adjudicate from this app behind the same button
 * as three that settle themselves.
 */
const PROOFS = [
  {
    tag: "InsufficientReserve",
    label: "The reserve does not back the bound",
    reads: "the certificate's claimed reserve against the vault's live balance",
    settles:
      "The auditor's allocation is slashed to the treasury and you are paid a share of the proven shortfall. It compensates no victim: a shortfall proves the covenant broke, not who lost money.",
  },
  {
    tag: "BoundExceeded",
    label: "Routed spend has passed the bound",
    reads: "the payment router's spend counter against the certified bound",
    settles:
      "The certificate is killed and you are paid a flat bounty. Nothing is slashed — routed flow is gross conduct, not loss, and a protocol that slashed on a counter would be paying people to run one up.",
  },
  {
    tag: "ExpiredCertificate",
    label: "The covenant outlived the certificate",
    reads: "the router's record of payments that settled after expiry",
    settles:
      "The certificate is killed and you are paid a flat bounty. Nothing is slashed, for the same reason.",
  },
] as const;

type ProofTag = (typeof PROOFS)[number]["tag"];

/** How the contract's verdict reads to someone who did not write the contract. */
const VERDICT_COPY: Record<string, string> = {
  Pending:
    "Filed, and settling nothing yet. It opened a 72-hour claim window — or joined one already open — so other claimants can file against the same certificate and be paid together. Once the window lapses, anyone may close it; this app holds no key and cannot do that for you.",
  ChallengeWins:
    "Upheld. The certificate is invalidated, and what follows depends on which proof carried it: a reserve shortfall slashes the auditor's allocation to the treasury and pays the challenger a share of the shortfall, while the two conduct proofs pay a flat bounty and slash nothing. Neither compensates a victim — a broken covenant proves that something went wrong, not who lost money, and only an arbiter's assessment can name and size a victim.",
  ChallengeFails: "Rejected: the reserve held up. The bond is forfeit.",
  Cured:
    "The operator remedied the shortfall during the window. The bond is returned in full — the claim was true when it was filed, and being right about that is what the bond is staked on.",
  Unadjudicated:
    "The window closed without an arbiter ruling on this claim. The bond is returned.",
};

export function ChallengeCertificate({ certId }: { certId: number }) {
  const bondId = useId();
  const victimId = useId();
  const proofId = useId();
  const { address } = useWallet();
  const { run } = useWalletActions();

  const [proofType, setProofType] = useState<ProofTag>("InsufficientReserve");
  const [bondUsd, setBondUsd] = useState("");
  const [victim, setVictim] = useState("");
  const [errors, setErrors] = useState<{ bond?: string; victim?: string }>({});
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<WalletActionError | null>(null);
  const [outcome, setOutcome] = useState<{
    hash: string;
    challengeId: number | null;
    verdict: string | null;
  } | null>(null);

  function validate() {
    const found: { bond?: string; victim?: string } = {};
    const bond = Number(bondUsd);
    if (!/^\d+(\.\d+)?$/.test(bondUsd.trim()) || !(bond > 0)) {
      found.bond = "Enter the bond as a positive amount in US dollars.";
    }
    if (!victim.trim()) {
      found.victim = "Enter the address you say was harmed.";
    } else if (!isAccountId(victim)) {
      found.victim =
        "That is not a Stellar account id. It starts with G and is 56 characters long.";
    }
    return found;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    setShowErrors(true);
    if (Object.keys(found).length > 0) return;

    setFailure(null);
    setOutcome(null);
    setBusy(true);
    try {
      const result = await run("challenge", {
        certId,
        proofType,
        victim: victim.trim(),
        bondUsd: Number(bondUsd),
      });
      const challengeId = asId(result.result);

      let verdict: string | null = null;
      if (challengeId !== null) {
        verdict = await fetch(`/api/challenge/${challengeId}`)
          .then((response) => response.json())
          .then((data: { verdict?: string | null }) => data.verdict ?? null)
          .catch(() => null);
      }

      setOutcome({ hash: result.hash, challengeId, verdict });
    } catch (error) {
      setFailure(
        error instanceof WalletActionError
          ? error
          : new WalletActionError(
              "submit",
              error instanceof Error ? error.message : String(error),
            ),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="challenge-heading"
      className="ring-foreground/6.5 bg-card mt-10 rounded-xl p-6 shadow ring-1"
    >
      <h2
        id="challenge-heading"
        className="text-foreground flex items-center gap-2 text-lg font-semibold"
      >
        <Gavel aria-hidden className="text-primary size-5" />
        Challenge this certificate
      </h2>
      <p className="text-muted-foreground mt-2 text-sm text-balance">
        Post a bond of your own money against a claim the contract can check for
        itself. No human decides any of these — each is arithmetic over state
        the contracts already hold, which is why a false one can be rejected in
        the same transaction that files it, with the bond forfeit. A true one
        does not settle on filing: it opens a 72-hour claim window so other
        claimants can join, and everything admitted is settled together when the
        window closes.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-5">
        <fieldset>
          <legend className="text-foreground text-sm font-medium">
            What you are claiming
          </legend>
          <div className="mt-2 space-y-2">
            {PROOFS.map((proof) => (
              <label
                key={proof.tag}
                htmlFor={`${proofId}-${proof.tag}`}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-lg p-3 ring-1 transition",
                  proofType === proof.tag
                    ? "ring-primary/40 bg-primary/5"
                    : "ring-foreground/10 hover:ring-foreground/20",
                )}
              >
                <input
                  id={`${proofId}-${proof.tag}`}
                  type="radio"
                  name={proofId}
                  value={proof.tag}
                  checked={proofType === proof.tag}
                  onChange={() => setProofType(proof.tag)}
                  className="accent-primary mt-1 size-4 shrink-0"
                />
                <span className="min-w-0">
                  <span className="text-foreground block text-sm font-medium">
                    {proof.label}
                  </span>
                  <span className="text-muted-foreground mt-1 block text-xs">
                    <span className="font-address">{proof.tag}</span> — the
                    contract reads {proof.reads}.
                  </span>
                </span>
              </label>
            ))}
          </div>
          <p className="text-muted-foreground mt-2 text-xs text-balance">
            {PROOFS.find((p) => p.tag === proofType)?.settles}
          </p>
        </fieldset>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor={bondId}
              className="text-foreground block text-sm font-medium"
            >
              Bond (USD)
            </label>
            <p
              id={`${bondId}-hint`}
              className="text-muted-foreground mb-1.5 mt-1 text-xs"
            >
              Your own capital, at risk if the challenge fails.
            </p>
            <input
              id={bondId}
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              placeholder="100"
              value={bondUsd}
              onChange={(event) => {
                setBondUsd(event.target.value);
                if (showErrors) setErrors(validate());
              }}
              aria-describedby={
                showErrors && errors.bond
                  ? `${bondId}-hint ${bondId}-error`
                  : `${bondId}-hint`
              }
              aria-invalid={showErrors && errors.bond ? true : undefined}
              className={inputClass(showErrors && errors.bond)}
            />
            {showErrors && errors.bond ? (
              <p
                id={`${bondId}-error`}
                className="text-destructive mt-1.5 text-xs"
              >
                {errors.bond}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor={victimId}
              className="text-foreground block text-sm font-medium"
            >
              Victim address
            </label>
            <p
              id={`${victimId}-hint`}
              className="text-muted-foreground mb-1.5 mt-1 text-xs"
            >
              Recorded on the claim as the party you say was harmed. It is not
              paid by this proof — naming someone is a filter, not evidence, and
              the contract has no way to check it. Compensation needs an
              arbiter&apos;s assessment.
            </p>
            <input
              id={victimId}
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="G…"
              value={victim}
              onChange={(event) => {
                setVictim(event.target.value);
                if (showErrors) setErrors(validate());
              }}
              aria-describedby={
                showErrors && errors.victim
                  ? `${victimId}-hint ${victimId}-error`
                  : `${victimId}-hint`
              }
              aria-invalid={showErrors && errors.victim ? true : undefined}
              className={inputClass(
                showErrors && errors.victim,
                "font-address",
              )}
            />
            {showErrors && errors.victim ? (
              <p
                id={`${victimId}-error`}
                className="text-destructive mt-1.5 text-xs"
              >
                {errors.victim}
              </p>
            ) : null}
          </div>
        </div>

        {failure ? (
          <div
            role="alert"
            className="ring-destructive/30 bg-destructive/5 mt-5 rounded-lg p-4 ring-1"
          >
            <h3 className="text-destructive flex items-center gap-2 text-sm font-semibold">
              <TriangleAlert aria-hidden className="size-4" />
              {STAGE_TITLE[failure.stage]}
            </h3>
            <p className="text-foreground mt-2 break-words text-sm">
              {failure.message}
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              {STAGE_HINT[failure.stage]}
            </p>
          </div>
        ) : null}

        {outcome ? (
          <div
            role="status"
            className="ring-primary/30 bg-primary/5 mt-5 rounded-lg p-4 ring-1"
          >
            <h3 className="text-foreground text-sm font-semibold">
              {outcome.verdict && outcome.verdict !== "Pending"
                ? `Challenge resolved: ${outcome.verdict}`
                : outcome.challengeId !== null
                  ? `Challenge #${outcome.challengeId} opened`
                  : "Challenge submitted"}
            </h3>
            <p className="text-muted-foreground mt-2 text-sm">
              {VERDICT_COPY[outcome.verdict ?? ""] ??
                "The challenge landed on-chain. Its verdict could not be read back just now."}
            </p>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-muted-foreground">Transaction hash</dt>
                <dd className="font-address min-w-0 break-all text-right">
                  {outcome.hash}
                </dd>
              </div>
              {outcome.challengeId !== null ? (
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-muted-foreground">Challenge ID</dt>
                  <dd className="font-address text-right">
                    #{outcome.challengeId}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <Button type="submit" variant="outline" disabled={busy || !address}>
            {busy ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {busy ? "Waiting for your wallet…" : "Open challenge"}
          </Button>
          {!address ? (
            <p className="text-muted-foreground text-sm">
              Connect a wallet in the header to post a bond.
            </p>
          ) : null}
        </div>
      </form>
    </section>
  );
}

function inputClass(invalid: string | false | undefined, extra?: string) {
  return cn(
    "bg-background ring-foreground/10 focus-visible:ring-ring h-10 w-full rounded-md px-3 text-sm shadow-sm ring-1 transition focus-visible:outline-none focus-visible:ring-2",
    invalid && "ring-destructive/60 focus-visible:ring-destructive",
    extra,
  );
}
