"use client";

/**
 * The three steps between a freshly installed wallet and one that can do
 * anything here: an account, a USDC trustline, and some test USDC.
 *
 * Each step is shown only while it is still the next thing to do, and the
 * middle one is deliberately the visitor's own signature — a faucet that could
 * open a trustline on somebody else's account would be a faucet with authority
 * over that account, and this one has none.
 *
 * Everything the panel says about the wallet comes from `/api/wallet/:address`,
 * so the buttons and the sentences under them come from one read.
 */
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Droplets } from "lucide-react";
import { ActionButton, ActionFailure } from "@/components/app/action-button";
import { formatUsdcExact } from "@/components/app/usdc";
import type { Gate } from "@/lib/preconditions";
import { useWallet } from "@/lib/wallet/wallet-provider";
import { useWalletFacts } from "@/lib/wallet/use-wallet-facts";
import {
  useWalletActions,
  WalletActionError,
} from "@/lib/wallet/use-wallet-actions";

interface FaucetStatus {
  configured: boolean;
  address?: string;
  availableStroops?: string | null;
  grantStroops?: string;
  empty?: boolean;
  cooldownCaveat?: string;
  error?: string;
}

const NO_WALLET: Gate = {
  ok: false,
  code: "no-wallet",
  reason: "Connect a wallet in the header to set it up.",
};

export function WalletSetup({
  onReady,
}: {
  /** Called whenever a step lands, so a parent can re-read the chain. */
  onReady?: () => void;
}) {
  const { address } = useWallet();
  const { run } = useWalletActions();
  const { facts, gates, loading, error, refresh } = useWalletFacts();

  const [busy, setBusy] = useState<"faucet" | "trustline" | null>(null);
  const [failure, setFailure] = useState<{
    title: string;
    message: string;
    raw?: string;
    recognised: boolean;
  } | null>(null);
  const [faucetStatus, setFaucetStatus] = useState<FaucetStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/faucet", { cache: "no-store" });
        const body = (await response.json()) as FaucetStatus;
        if (!cancelled) setFaucetStatus(body);
      } catch {
        if (!cancelled) setFaucetStatus(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const settled = useCallback(() => {
    refresh();
    onReady?.();
  }, [refresh, onReady]);

  const askFaucet = useCallback(async () => {
    if (!address) return;
    setBusy("faucet");
    setFailure(null);
    try {
      const response = await fetch("/api/faucet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const body = (await response.json()) as {
        error?: string;
        code?: string;
        step?: string;
      };
      if (!response.ok) {
        setFailure({
          title: "The faucet did not pay out",
          message: body.error ?? `The faucet returned ${response.status}.`,
          recognised: body.code !== undefined,
        });
        return;
      }
      settled();
    } finally {
      setBusy(null);
    }
  }, [address, settled]);

  const openTrustline = useCallback(async () => {
    setBusy("trustline");
    setFailure(null);
    try {
      await run("trustline", {});
      settled();
    } catch (cause) {
      const failed =
        cause instanceof WalletActionError
          ? cause
          : new WalletActionError(
              "submit",
              cause instanceof Error ? cause.message : String(cause),
            );
      setFailure({
        title:
          failed.stage === "sign"
            ? "The trustline was not signed"
            : "The trustline could not be opened",
        message: failed.message,
        raw: failed.raw,
        recognised: failed.code !== undefined,
      });
    } finally {
      setBusy(null);
    }
  }, [run, settled]);

  // Nothing to prepare once all three are done.
  const ready =
    facts !== null &&
    facts.accountExists &&
    facts.trustlineOpen &&
    facts.usdcStroops !== null &&
    BigInt(facts.usdcStroops) > 0n;

  const faucetEmpty =
    faucetStatus?.configured === true && faucetStatus.empty === true;
  const faucetMissing = faucetStatus?.configured === false;

  return (
    <section
      aria-labelledby="wallet-setup-heading"
      className="ring-foreground/6.5 bg-card mt-8 rounded-xl p-6 shadow ring-1"
    >
      <h2
        id="wallet-setup-heading"
        className="text-foreground flex items-center gap-2 text-base font-semibold"
      >
        <Droplets aria-hidden className="text-primary size-5" />
        Get this wallet ready
      </h2>
      <p className="text-muted-foreground mt-2 text-sm text-balance">
        Everything here runs on Stellar testnet. The XLM and the USDC are test
        assets with no value, handed out by this site so a stranger can walk the
        whole flow without owning anything first.
      </p>

      {error ? (
        <p className="text-destructive mt-4 text-sm">
          This wallet could not be read: {error}. Nothing below is a statement
          about your balances.
        </p>
      ) : null}

      {ready ? (
        <p className="text-foreground mt-4 flex items-center gap-2 text-sm">
          <CheckCircle2 aria-hidden className="text-primary size-4" />
          Ready: account funded, trustline open, holding{" "}
          {formatUsdcExact(facts.usdcStroops!)} of test USDC.
        </p>
      ) : (
        <ol className="mt-5 space-y-6">
          <Step
            n={1}
            done={facts?.accountExists === true}
            title="Fund the account"
            body="A Stellar address does nothing until an account exists for it. Friendbot creates one with test XLM, which pays the network fees for everything that follows."
          >
            {facts?.accountExists ? null : (
              <ActionButton
                gate={address ? (gates?.faucet ?? null) : NO_WALLET}
                checking={Boolean(address) && loading}
                pending={busy === "faucet"}
                pendingLabel="Asking the faucet…"
                onClick={askFaucet}
              >
                Create the account
              </ActionButton>
            )}
          </Step>

          <Step
            n={2}
            done={facts?.trustlineOpen === true}
            title="Open a USDC trustline"
            body="Your wallet signs this one. A trustline is your account agreeing to hold the asset; nobody can open one on your behalf, and a faucet that could would have authority over your account."
          >
            {facts?.trustlineOpen || !facts?.accountExists ? null : (
              <ActionButton
                gate={address ? (gates?.trustline ?? null) : NO_WALLET}
                checking={Boolean(address) && loading}
                pending={busy === "trustline"}
                onClick={openTrustline}
              >
                Open the trustline
              </ActionButton>
            )}
          </Step>

          <Step
            n={3}
            done={
              facts?.usdcStroops !== null &&
              facts?.usdcStroops !== undefined &&
              BigInt(facts.usdcStroops) > 0n
            }
            title="Get test USDC"
            body="Reserves, stakes and challenge bonds are all posted in USDC. Publishing a certificate needs none of it — funding one needs all of it."
          >
            {!facts?.trustlineOpen ? null : (
              <ActionButton
                gate={address ? (gates?.faucet ?? null) : NO_WALLET}
                checking={Boolean(address) && loading}
                pending={busy === "faucet"}
                pendingLabel="Asking the faucet…"
                onClick={askFaucet}
                reasonOverride={
                  faucetMissing
                    ? "This deployment has no faucet key configured, so it cannot hand out USDC."
                    : faucetEmpty
                      ? `The faucet is empty — it holds ${formatUsdcExact(faucetStatus?.availableStroops ?? "0")} and a grant is ${formatUsdcExact(faucetStatus?.grantStroops ?? "0")}. It has to be refilled before this step will work.`
                      : null
                }
              >
                Send me test USDC
              </ActionButton>
            )}
          </Step>
        </ol>
      )}

      {faucetStatus?.cooldownCaveat ? (
        <p className="text-muted-foreground mt-5 text-xs text-balance">
          {faucetStatus.cooldownCaveat}
        </p>
      ) : null}

      {failure ? (
        <ActionFailure
          title={failure.title}
          message={failure.message}
          raw={failure.raw}
          recognised={failure.recognised}
          action="wallet setup"
        />
      ) : null}
    </section>
  );
}

function Step({
  n,
  done,
  title,
  body,
  children,
}: {
  n: number;
  done: boolean;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <span
        aria-hidden
        className={
          done
            ? "bg-primary/10 text-primary grid size-7 shrink-0 place-items-center rounded-full text-xs font-medium"
            : "bg-muted text-muted-foreground grid size-7 shrink-0 place-items-center rounded-full text-xs font-medium"
        }
      >
        {done ? "✓" : n}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-foreground text-sm font-medium">
          {title}
          {done ? (
            <span className="text-primary ml-2 text-xs font-normal">done</span>
          ) : null}
        </h3>
        <p className="text-muted-foreground mt-1 text-sm text-balance">
          {body}
        </p>
        {children ? <div className="mt-3">{children}</div> : null}
      </div>
    </li>
  );
}
