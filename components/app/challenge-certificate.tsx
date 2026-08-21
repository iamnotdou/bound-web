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

/** How the contract's verdict reads to someone who did not write the contract. */
const VERDICT_COPY: Record<string, string> = {
  Pending:
    "Open and unresolved. The verdict is decided by a separate, permissionless resolve transaction that nobody has sent yet — this app holds no key and cannot send it for you.",
  ChallengeWins:
    "Resolved in the challenger's favour: the reserve did not back the certificate. The auditor's stake is slashed and the victim compensated.",
  ChallengeFails:
    "Resolved against the challenger: the reserve held up. The bond is forfeit.",
};

export function ChallengeCertificate({ certId }: { certId: number }) {
  const bondId = useId();
  const victimId = useId();
  const { address } = useWallet();
  const { run } = useWalletActions();

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
      found.victim = "Enter the address that stands to be compensated.";
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
        proofType: "InsufficientReserve",
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
        Post a bond claiming the reserve does not back the bound — the{" "}
        <strong className="text-foreground">InsufficientReserve</strong> proof.
        The contract checks the reserve itself. If you are wrong, the bond is
        forfeit; if you are right, the auditor&apos;s stake is slashed and the
        victim compensated.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-5">
        <div className="grid gap-5 sm:grid-cols-2">
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
              Who gets compensated if the challenge succeeds.
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
