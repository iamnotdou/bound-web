"use client";

/**
 * What the certificate claims for its reserve, and what the vault actually
 * holds — side by side, always both.
 *
 * This panel exists because the certificate page used to print the *claimed*
 * `reserve_amount` under the caption "Pre-funded by the operator and locked
 * against the bound". For a certificate whose vault holds nothing, every word
 * of that was false. The claim is still shown, because it is what the operator
 * committed to; it is just no longer allowed to stand alone.
 *
 * "Unreadable" and "empty" are kept apart all the way down: a null vault
 * balance renders as "could not be read", never as `$0`.
 */
import { useCallback } from "react";
import { Vault } from "lucide-react";
import { ActionButton, ActionFailure } from "@/components/app/action-button";
import { formatUsdcExact } from "@/components/app/usdc";
import type { CertFacts } from "@/lib/bound";
import type { CertState } from "@/lib/cert-state";
import type { Gate } from "@/lib/preconditions";
import { cn } from "@/lib/utils";
import {
  depositFailureCopy,
  useFundReserve,
} from "@/lib/wallet/use-fund-reserve";
import { useWallet } from "@/lib/wallet/wallet-provider";
import { useWalletFacts } from "@/lib/wallet/use-wallet-facts";

const NO_WALLET: Gate = {
  ok: false,
  code: "no-wallet",
  reason:
    "Connect the operator's wallet in the header to fund this certificate's reserve.",
};

export function ReservePanel({
  facts,
  state,
}: {
  facts: CertFacts;
  state: CertState;
}) {
  const { address } = useWallet();
  const {
    gates,
    loading,
    refresh,
    error: walletError,
  } = useWalletFacts(facts.cert.certId);
  const { fund: deposit, busy, hash, failure } = useFundReserve(refresh);

  const claimed = BigInt(facts.reserve.claimedStroops);
  const vault =
    facts.reserve.vaultStroops === null
      ? null
      : BigInt(facts.reserve.vaultStroops);
  const shortfall =
    state.reserveShortfallStroops === null
      ? null
      : BigInt(state.reserveShortfallStroops);

  const fund = useCallback(() => {
    if (shortfall === null || shortfall <= 0n) return;
    void deposit(facts.cert.certId, shortfall.toString());
  }, [deposit, facts.cert.certId, shortfall]);

  return (
    <section
      aria-labelledby="reserve-heading"
      className="ring-foreground/6.5 bg-card mt-10 rounded-xl p-6 shadow ring-1"
    >
      <h2
        id="reserve-heading"
        className="text-foreground flex items-center gap-2 text-lg font-semibold"
      >
        <Vault aria-hidden className="text-primary size-5" />
        The reserve
      </h2>
      <p className="text-muted-foreground mt-2 text-sm text-balance">
        Two different numbers. One is what the certificate says; the other is
        what the vault holds.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Figure
          label="Claimed on the certificate"
          value={formatUsdcExact(claimed)}
          caption="Written into the registry at publish time. No money moved when it was written."
        />
        <Figure
          label="Held by the reserve vault"
          value={vault === null ? "Unreadable" : formatUsdcExact(vault)}
          caption={
            vault === null
              ? "The vault did not answer. This is not a balance of zero — it is the absence of an answer."
              : vault >= claimed
                ? "Read live from ReserveVault.get_balance. It backs the claim in full."
                : "Read live from ReserveVault.get_balance. It is what a challenger's arithmetic would use."
          }
          emphasis={vault !== null && vault < claimed}
        />
      </div>

      <FundingBar
        ratio={state.reserveFundedRatio}
        shortfall={shortfall}
        claimed={claimed}
      />

      {state.nextStep === "fund" ? (
        <div className="mt-6">
          <ActionButton
            gate={address ? (gates?.fund ?? null) : NO_WALLET}
            checking={Boolean(address) && loading}
            pending={busy}
            onClick={fund}
            // An unreadable vault derives to `pending-unfunded` so that it
            // grants the least, which puts this button on screen with a
            // shortfall of `null` behind it — `fund()` would return early and
            // say nothing. The gate cannot see that; it only knows the vault
            // did not contradict it. Same case `PublishedStep` already covers.
            reasonOverride={
              shortfall === null
                ? "The vault balance could not be read, so there is no shortfall to fund. Reload and try again."
                : null
            }
          >
            {shortfall !== null && shortfall > 0n
              ? `Fund the reserve — ${formatUsdcExact(shortfall)}`
              : "Fund the reserve"}
          </ActionButton>
          {walletError ? (
            <p className="text-destructive mt-2 text-sm">
              This wallet could not be read: {walletError}
            </p>
          ) : null}
        </div>
      ) : null}

      {hash ? (
        <p role="status" className="text-foreground mt-4 text-sm">
          Deposit submitted —{" "}
          <span className="font-address break-all">{hash}</span>. The figures
          above are re-read from the chain, not from the transaction.
        </p>
      ) : null}

      {failure ? (
        <ActionFailure
          title={depositFailureCopy(failure).title}
          message={failure.message}
          raw={failure.raw}
          recognised={failure.code !== undefined}
          action="deposit"
          certId={facts.cert.certId}
          hint={depositFailureCopy(failure).hint}
        />
      ) : null}
    </section>
  );
}

function FundingBar({
  ratio,
  shortfall,
  claimed,
}: {
  ratio: number | null;
  shortfall: bigint | null;
  claimed: bigint;
}) {
  if (ratio === null) {
    return (
      <p className="text-muted-foreground mt-5 text-sm">
        {claimed <= 0n
          ? "This certificate claims no reserve, so there is no ratio to show."
          : "There is no ratio to show: the vault balance could not be read, and a ratio against an unknown is not a number."}
      </p>
    );
  }

  const percent = Math.min(100, Math.round(ratio * 100));
  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          {shortfall !== null && shortfall > 0n ? (
            <>
              Short by{" "}
              <strong className="text-foreground">
                {formatUsdcExact(shortfall)}
              </strong>
            </>
          ) : (
            "Fully funded"
          )}
        </p>
        <p className="text-muted-foreground text-sm tabular-nums">
          {(ratio * 100).toFixed(ratio * 100 < 10 ? 2 : 1)}%
        </p>
      </div>
      <div
        role="img"
        aria-label={`${percent}% of the claimed reserve is held by the vault`}
        className="bg-muted mt-2 h-2 w-full overflow-hidden rounded-full"
      >
        <div
          className={cn(
            "h-full rounded-full",
            shortfall !== null && shortfall > 0n
              ? "bg-destructive/70"
              : "bg-primary",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function Figure({
  label,
  value,
  caption,
  emphasis = false,
}: {
  label: string;
  value: string;
  caption: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg p-4 ring-1",
        emphasis
          ? "ring-destructive/30 bg-destructive/5"
          : "ring-foreground/10",
      )}
    >
      <p className="text-muted-foreground text-xs uppercase tracking-wide">
        {label}
      </p>
      <p className="text-foreground mt-1.5 text-2xl font-semibold tabular-nums">
        {value}
      </p>
      <p className="text-muted-foreground mt-2 text-sm text-balance">
        {caption}
      </p>
    </div>
  );
}
