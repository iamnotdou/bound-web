"use client";

/**
 * Everything an auditor needs in one place: what this wallet has staked, what
 * of it is free, and which certificates are actually waiting for an
 * attestation.
 *
 * The waiting list is computed on the server from live vault balances, not
 * from the certificates' own claimed reserves — a Pending certificate whose
 * vault is empty is not waiting for an auditor, it is waiting for its operator.
 * Showing it here would send auditors at work that cannot be done.
 */
import { useCallback, useId, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Landmark } from "lucide-react";
import { ActionButton, ActionFailure } from "@/components/app/action-button";
import { Address } from "@/components/app/address";
import { DemoAuditorNote } from "@/components/app/demo-auditor-note";
import { formatUsdcExact } from "@/components/app/usdc";
import type { CertListItem } from "@/lib/bound";
import type { Gate } from "@/lib/preconditions";
import {
  useWalletActions,
  WalletActionError,
} from "@/lib/wallet/use-wallet-actions";
import { useWallet } from "@/lib/wallet/wallet-provider";
import { useWalletFacts } from "@/lib/wallet/use-wallet-facts";

export interface AwaitingCert {
  cert: CertListItem;
  claimedStroops: string;
  vaultStroops: string;
}

const NO_WALLET: Gate = {
  ok: false,
  code: "no-wallet",
  reason: "Connect a wallet in the header to stake as an auditor.",
};

function usdToStroops(raw: string): string | null {
  if (!/^\d+(\.\d{1,7})?$/.test(raw.trim())) return null;
  const [whole, frac = ""] = raw.trim().split(".");
  const stroops =
    BigInt(whole || "0") * 10_000_000n + BigInt((frac + "0000000").slice(0, 7));
  return stroops > 0n ? stroops.toString() : null;
}

export function AuditorConsole({ awaiting }: { awaiting: AwaitingCert[] }) {
  const stakeId = useId();
  const router = useRouter();
  const { address } = useWallet();
  const { run } = useWalletActions();
  const { facts, gates, loading, error, refresh } = useWalletFacts();

  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [hash, setHash] = useState<string | null>(null);
  const [failure, setFailure] = useState<WalletActionError | null>(null);

  const stroops = usdToStroops(amount);
  const held = facts?.usdcStroops ?? null;
  const overBalance =
    stroops !== null && held !== null && BigInt(stroops) > BigInt(held);

  const stake = useCallback(async () => {
    if (stroops === null) return;
    setBusy(true);
    setFailure(null);
    try {
      const outcome = await run("stake", { amountUsd: Number(amount) });
      setHash(outcome.hash);
      refresh();
      router.refresh();
    } catch (error_) {
      setFailure(
        error_ instanceof WalletActionError
          ? error_
          : new WalletActionError(
              "submit",
              error_ instanceof Error ? error_.message : String(error_),
            ),
      );
    } finally {
      setBusy(false);
    }
  }, [amount, refresh, router, run, stroops]);

  const auditor = facts?.auditor ?? null;

  return (
    <div className="mt-8">
      <section
        aria-labelledby="book-heading"
        className="ring-foreground/6.5 bg-card rounded-xl p-6 shadow ring-1"
      >
        <h2
          id="book-heading"
          className="text-foreground flex items-center gap-2 text-lg font-semibold"
        >
          <Landmark aria-hidden className="text-primary size-5" />
          Your book
        </h2>

        {!address ? (
          <p className="text-muted-foreground mt-3 text-sm">
            Connect a wallet in the header to see what it has staked.
          </p>
        ) : error ? (
          <p className="text-destructive mt-3 text-sm">
            This wallet could not be read: {error}. Nothing below is a statement
            about your stake.
          </p>
        ) : auditor === null ? (
          <p className="text-muted-foreground mt-3 text-sm">
            {loading
              ? "Reading this wallet…"
              : "The staking contract did not answer, so this wallet's book is unknown — which is not the same as empty."}
          </p>
        ) : (
          <>
            <dl className="mt-5 grid gap-3 sm:grid-cols-3">
              <Stat
                label="Total staked"
                value={formatUsdcExact(
                  BigInt(auditor.freeStakeStroops) +
                    BigInt(auditor.allocatedStroops),
                )}
                caption="Custodied by the staking contract. Free plus allocated."
              />
              <Stat
                label="Free"
                value={formatUsdcExact(auditor.freeStakeStroops)}
                caption="Not standing behind any certificate. This is what you can allocate or withdraw."
                emphasis
              />
              <Stat
                label="Allocated"
                value={formatUsdcExact(auditor.allocatedStroops)}
                caption="Bonded to live certificates and locked until their settlement deadlines."
              />
            </dl>
            <p className="text-muted-foreground mt-4 text-sm text-balance">
              {auditor.registered
                ? `Registered: this wallet's free stake meets the ${formatUsdcExact(auditor.minStakeStroops)} minimum, so it may attest.`
                : `Not registered. Registration is judged on free stake, and the minimum is ${formatUsdcExact(auditor.minStakeStroops)} — because what an auditor needs before vouching for one more certificate is capital that is not already vouching for another.`}
            </p>
          </>
        )}

        <div className="mt-6 max-w-sm">
          <label
            htmlFor={stakeId}
            className="text-foreground block text-sm font-medium"
          >
            Stake more (USD)
          </label>
          <p
            id={`${stakeId}-hint`}
            className="text-muted-foreground mb-1.5 mt-1 text-xs text-balance"
          >
            Deposited capital starts entirely free. It only goes at risk when
            you allocate it to a certificate.
            {held !== null
              ? ` This wallet holds ${formatUsdcExact(held)}.`
              : ""}
          </p>
          <input
            id={stakeId}
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            placeholder="2000"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-describedby={`${stakeId}-hint`}
            aria-invalid={overBalance || undefined}
            className="bg-background ring-foreground/10 focus-visible:ring-ring h-10 w-full rounded-md px-3 text-sm shadow-sm ring-1 transition focus-visible:outline-none focus-visible:ring-2"
          />
        </div>

        <div className="mt-4">
          <ActionButton
            gate={address ? (gates?.stake ?? null) : NO_WALLET}
            checking={Boolean(address) && loading}
            pending={busy}
            onClick={stake}
            reasonOverride={
              overBalance
                ? "That is more USDC than this wallet holds."
                : stroops === null && gates?.stake.ok
                  ? "Enter an amount to stake."
                  : null
            }
          >
            Stake
          </ActionButton>
        </div>

        {hash ? (
          <p role="status" className="text-foreground mt-4 text-sm">
            Stake submitted —{" "}
            <span className="font-address break-all">{hash}</span>. The figures
            above are re-read from the staking contract.
          </p>
        ) : null}

        {failure ? (
          <ActionFailure
            title={
              failure.stage === "build"
                ? "The stake could not be built"
                : failure.stage === "sign"
                  ? "The stake was not signed"
                  : "The stake did not land"
            }
            message={failure.message}
            raw={failure.raw}
            recognised={failure.code !== undefined}
            action="stake"
          />
        ) : null}

        {facts?.isDemoAuditor ? <DemoAuditorNote className="mt-6" /> : null}
      </section>

      <section aria-labelledby="awaiting-heading" className="mt-10">
        <h2
          id="awaiting-heading"
          className="text-foreground text-lg font-semibold"
        >
          Waiting for an auditor
        </h2>
        <p className="text-muted-foreground mt-2 text-sm text-balance">
          Certificates whose reserve vault already holds what they claim, and
          which no auditor has attested. A Pending certificate with an empty
          vault is not on this list — it is waiting for its operator, not for
          you.
        </p>

        {awaiting.length === 0 ? (
          <p className="ring-foreground/6.5 bg-card text-muted-foreground mt-4 rounded-xl px-6 py-10 text-center text-sm shadow ring-1">
            Nothing is waiting. Every funded certificate in the registry has
            already been attested — or nobody has funded one lately.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {awaiting.map(({ cert, claimedStroops, vaultStroops }) => (
              <li
                key={cert.certId}
                className="ring-foreground/6.5 bg-card rounded-xl p-4 shadow ring-1"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">
                      Certificate #{cert.certId}
                    </p>
                    <div className="mt-1">
                      <Address value={cert.agent} edge={8} />
                    </div>
                  </div>
                  <Link
                    href={`/app/cert/${cert.certId}`}
                    className="text-primary text-sm font-medium hover:underline"
                  >
                    Attest it
                  </Link>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-muted-foreground text-xs">Bound</dt>
                    <dd className="tabular-nums">{cert.boundUsd}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">
                      Reserve held
                    </dt>
                    <dd className="tabular-nums">
                      {formatUsdcExact(vaultStroops)}
                      <span className="text-muted-foreground">
                        {" / "}
                        {formatUsdcExact(claimedStroops)}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">Expires</dt>
                    <dd>{cert.expiresAtIso?.slice(0, 10) ?? "no expiry"}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
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
    <div className="ring-foreground/10 rounded-lg p-4 ring-1">
      <dt className="text-muted-foreground text-xs uppercase tracking-wide">
        {label}
      </dt>
      <dd
        className={
          emphasis
            ? "text-primary mt-1.5 text-xl font-semibold tabular-nums"
            : "text-foreground mt-1.5 text-xl font-semibold tabular-nums"
        }
      >
        {value}
      </dd>
      <dd className="text-muted-foreground mt-2 text-xs text-balance">
        {caption}
      </dd>
    </div>
  );
}
