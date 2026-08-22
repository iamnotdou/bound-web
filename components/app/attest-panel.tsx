"use client";

/**
 * The auditor's side of a certificate: what this wallet has to stake with, how
 * much of it would stand behind this one, and the button that bonds it.
 *
 * The allocation is a required field, deliberately. `buildActionXdr` defaults
 * it to $500, and a defaulted allocation is an auditor not pricing its own
 * risk — which is the single thing an attestation is for. The field is bounded
 * by free stake because allocated capital is already standing behind something
 * else.
 *
 * The demo-auditor shortcut is offered only when the connected wallet cannot
 * attest, and it is labelled for what it is: boundprotocol.dev signing as
 * itself, not a third party appearing from nowhere.
 */
import { useCallback, useId, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { ActionButton, ActionFailure } from "@/components/app/action-button";
import { DemoAuditorNote } from "@/components/app/demo-auditor-note";
import { formatUsdcExact } from "@/components/app/usdc";
import type { CertFacts } from "@/lib/bound";
import type { CertState } from "@/lib/cert-state";
import type { Gate } from "@/lib/preconditions";
import {
  useWalletActions,
  WalletActionError,
} from "@/lib/wallet/use-wallet-actions";
import { useWallet } from "@/lib/wallet/wallet-provider";
import { useWalletFacts } from "@/lib/wallet/use-wallet-facts";

const NO_WALLET: Gate = {
  ok: false,
  code: "no-wallet",
  reason:
    "Connect a registered auditor's wallet in the header to bond capital to this certificate.",
};

/** Dollars → stroops without a float, so the gate compares like with like. */
function usdToStroops(raw: string): string | null {
  if (!/^\d+(\.\d{1,7})?$/.test(raw.trim())) return null;
  const [whole, frac = ""] = raw.trim().split(".");
  const padded = (frac + "0000000").slice(0, 7);
  const stroops = BigInt(whole || "0") * 10_000_000n + BigInt(padded);
  return stroops > 0n ? stroops.toString() : null;
}

export function AttestPanel({
  facts,
  state,
}: {
  facts: CertFacts;
  state: CertState;
}) {
  const certId = facts.cert.certId;
  const allocationId = useId();
  const router = useRouter();
  const { address } = useWallet();
  const { run } = useWalletActions();
  const { facts: wallet, gates, loading, refresh } = useWalletFacts(certId);

  const [allocation, setAllocation] = useState("");
  const [busy, setBusy] = useState<"wallet" | "demo" | null>(null);
  const [failure, setFailure] = useState<{
    title: string;
    message: string;
    raw?: string;
    recognised: boolean;
  } | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [signedByDemo, setSignedByDemo] = useState(false);

  const free = wallet?.auditor?.freeStakeStroops ?? null;
  const stroops = usdToStroops(allocation);
  const overFree =
    stroops !== null && free !== null && BigInt(stroops) > BigInt(free);

  const settled = useCallback(() => {
    refresh();
    router.refresh();
  }, [refresh, router]);

  const attestWithWallet = useCallback(async () => {
    if (stroops === null) return;
    setBusy("wallet");
    setFailure(null);
    try {
      const outcome = await run("attest", {
        certId,
        allocationUsd: Number(allocation),
      });
      setHash(outcome.hash);
      setSignedByDemo(false);
      settled();
    } catch (error) {
      const failed =
        error instanceof WalletActionError
          ? error
          : new WalletActionError(
              "submit",
              error instanceof Error ? error.message : String(error),
            );
      setFailure({
        title:
          failed.stage === "build"
            ? "The attestation could not be built"
            : failed.stage === "sign"
              ? "The attestation was not signed"
              : "The attestation did not land",
        message: failed.message,
        raw: failed.raw,
        recognised: failed.code !== undefined,
      });
    } finally {
      setBusy(null);
    }
  }, [allocation, certId, run, settled, stroops]);

  const attestWithDemo = useCallback(async () => {
    if (stroops === null) return;
    setBusy("demo");
    setFailure(null);
    try {
      const response = await fetch("/api/attest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ certId, allocationUsd: Number(allocation) }),
      });
      const body = (await response.json()) as {
        hash?: string;
        error?: string;
        code?: string;
        raw?: string;
      };
      if (!response.ok) {
        setFailure({
          title: "The demo auditor did not attest",
          message: body.error ?? `The endpoint returned ${response.status}.`,
          raw: body.raw,
          recognised: body.code !== undefined,
        });
        return;
      }
      setHash(body.hash ?? null);
      setSignedByDemo(true);
      settled();
    } finally {
      setBusy(null);
    }
  }, [allocation, certId, settled, stroops]);

  // Nothing to offer once somebody has attested, or while the reserve is short.
  if (facts.cert.auditor !== null) {
    return state.demoAuditor ? (
      <div className="mt-10">
        <DemoAuditorNote />
      </div>
    ) : null;
  }

  const walletGate: Gate | null = address ? (gates?.attest ?? null) : NO_WALLET;
  const walletCanAttest = walletGate?.ok === true;

  return (
    <section
      aria-labelledby="attest-heading"
      className="ring-foreground/6.5 bg-card mt-10 rounded-xl p-6 shadow ring-1"
    >
      <h2
        id="attest-heading"
        className="text-foreground flex items-center gap-2 text-lg font-semibold"
      >
        <BadgeCheck aria-hidden className="text-primary size-5" />
        Attest this certificate
      </h2>
      <p className="text-muted-foreground mt-2 text-sm text-balance">
        An attestation bonds a named slice of an auditor&apos;s own capital to
        this certificate. It is locked until the settlement deadline and it is
        slashable — that is what makes an attestation worth anything, and it is
        why the amount is yours to choose rather than ours to default.
      </p>

      {state.nextStep !== "attest" ? (
        <p className="text-muted-foreground mt-4 text-sm">
          This certificate is not ready for an auditor yet.{" "}
          {state.reserveShortfallStroops !== null &&
          state.reserveShortfallStroops !== "0"
            ? `Its reserve is short by ${formatUsdcExact(state.reserveShortfallStroops)}.`
            : "See the state above."}
        </p>
      ) : (
        <>
          {wallet?.auditor ? (
            <dl className="mt-5 grid gap-3 sm:grid-cols-3">
              <Stat
                label="Your total stake"
                value={formatUsdcExact(
                  BigInt(wallet.auditor.freeStakeStroops) +
                    BigInt(wallet.auditor.allocatedStroops),
                )}
              />
              <Stat
                label="Free to allocate"
                value={formatUsdcExact(wallet.auditor.freeStakeStroops)}
                emphasis
              />
              <Stat
                label="Already allocated"
                value={formatUsdcExact(wallet.auditor.allocatedStroops)}
              />
            </dl>
          ) : null}

          <div className="mt-5 max-w-sm">
            <label
              htmlFor={allocationId}
              className="text-foreground block text-sm font-medium"
            >
              Allocation (USD)
            </label>
            <p
              id={`${allocationId}-hint`}
              className="text-muted-foreground mb-1.5 mt-1 text-xs text-balance"
            >
              The slice of free stake that stands behind this certificate, and
              the most a slash can ever take from you for it.
              {free !== null ? ` You have ${formatUsdcExact(free)} free.` : ""}
            </p>
            <input
              id={allocationId}
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              placeholder="1000"
              value={allocation}
              onChange={(event) => setAllocation(event.target.value)}
              aria-describedby={`${allocationId}-hint`}
              aria-invalid={overFree || undefined}
              className="bg-background ring-foreground/10 focus-visible:ring-ring h-10 w-full rounded-md px-3 text-sm shadow-sm ring-1 transition focus-visible:outline-none focus-visible:ring-2"
            />
            {overFree ? (
              <p className="text-destructive mt-1.5 text-xs">
                That is more than this wallet has free. Allocated capital is
                already standing behind another certificate.
              </p>
            ) : null}
          </div>

          <div className="mt-5">
            <ActionButton
              gate={walletGate}
              checking={Boolean(address) && loading}
              pending={busy === "wallet"}
              onClick={attestWithWallet}
              reasonOverride={
                walletCanAttest && stroops === null
                  ? "Enter the allocation you are prepared to put at risk. There is no sensible default."
                  : overFree
                    ? "Lower the allocation to what this wallet has free."
                    : null
              }
            >
              Attest with this wallet
            </ActionButton>
          </div>

          {!walletCanAttest ? (
            <div className="ring-foreground/10 bg-muted/30 mt-6 rounded-xl p-5 ring-1">
              <h3 className="text-foreground text-sm font-semibold">
                Or let boundprotocol.dev&apos;s auditor sign
              </h3>
              <p className="text-muted-foreground mt-2 text-sm text-balance">
                The last step of this flow has to come from a second party, and
                a browser wallet holds one key. If you would rather not stake as
                an auditor yourself, our own auditor account will attest —
                putting its real, slashable testnet capital behind this
                certificate.
              </p>
              <p className="text-muted-foreground mt-2 text-sm text-balance">
                It is not an independent third party, and the certificate will
                say so wherever it appears.
              </p>
              <div className="mt-4">
                <ActionButton
                  variant="outline"
                  gate={
                    stroops === null
                      ? {
                          ok: false,
                          code: "insufficient-free-stake",
                          reason:
                            "Enter an allocation first — the demo auditor prices its risk the same way you would.",
                        }
                      : { ok: true }
                  }
                  pending={busy === "demo"}
                  pendingLabel="Signing as the demo auditor…"
                  onClick={attestWithDemo}
                >
                  Attest as the demo auditor
                </ActionButton>
              </div>
              <DemoAuditorNote className="mt-4" />
            </div>
          ) : null}
        </>
      )}

      {hash ? (
        <p role="status" className="text-foreground mt-5 text-sm">
          Attestation submitted{signedByDemo ? " by the demo auditor" : ""} —{" "}
          <span className="font-address break-all">{hash}</span>. Reload to see
          what the registry says;{" "}
          <Link
            href={`/app/cert/${certId}`}
            className="text-primary hover:underline"
          >
            this page
          </Link>{" "}
          reads it back from the chain rather than from the transaction.
        </p>
      ) : null}

      {failure ? (
        <ActionFailure
          title={failure.title}
          message={failure.message}
          raw={failure.raw}
          recognised={failure.recognised}
          action="attest"
          certId={certId}
        />
      ) : null}
    </section>
  );
}

function Stat({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
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
    </div>
  );
}
