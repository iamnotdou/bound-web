"use client";

/**
 * The fiat boundary, as a thing a person can actually use.
 *
 * The panel's hardest job is not the flow, it is the disclosure. The deployed
 * contracts hold a self-issued test USDC and the anchor issues its own, so a
 * completed deposit right now funds the connected wallet and **cannot** fund a
 * certificate's reserve. Saying "fund your reserve with fiat" would be false,
 * and the one thing this app does not do is print a plausible number that is
 * not true. `fundsReserve` comes from the server, which compares the two
 * issuers, and every heading below keys off it.
 */
import { useEffect, useState } from "react";
import {
  amountRefusal,
  isTransferAmount,
  type TransferLimits,
} from "@/lib/anchor-limits";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ExternalLink,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import { ActionButton } from "@/components/app/action-button";
import { Address } from "@/components/app/address";
import {
  anchorFailureHint,
  useAnchorTransfer,
  type TransferKind,
  type TransferProtocol,
} from "@/lib/wallet/use-anchor-transfer";
import { useWallet } from "@/lib/wallet/wallet-provider";
import { cn } from "@/lib/utils";

interface AnchorInfo {
  homeDomain: string;
  protocol: TransferProtocol;
  assetCode: string;
  issuer: string | null;
  deposit: TransferLimits;
  withdraw: TransferLimits;
  deploymentIssuer: string;
  fundsReserve: boolean;
}

/** SEP-24 and SEP-6 statuses, in the words a person can act on. */
const STATUS_COPY: Record<string, string> = {
  incomplete: "Waiting for you to finish the anchor's form.",
  pending_user_transfer_start:
    "The anchor is waiting for your money. Follow the instructions it gave you.",
  pending_trust:
    "The anchor is holding the asset until your wallet trusts it. Open a trustline and it will complete.",
  pending_user_transfer_complete:
    "The anchor says you have sent it. It is confirming.",
  pending_anchor: "The anchor is processing this.",
  pending_stellar: "The anchor is sending the asset on Stellar now.",
  pending_external: "Waiting on the banking rail outside Stellar.",
  completed: "Done. The asset has moved on-chain.",
  refunded: "The anchor refunded this transfer.",
  expired: "This transfer expired before it completed.",
  error: "The anchor reported an error on this transfer.",
};

function limitLabel(limits: TransferLimits, code: string): string {
  if (!limits.enabled) return "not offered by this anchor";
  // null is "the anchor did not say" — never rendered as a bound of zero.
  if (limits.minAmount === null && limits.maxAmount === null) {
    return "no limits stated";
  }
  const min = limits.minAmount === null ? "?" : limits.minAmount;
  const max = limits.maxAmount === null ? "?" : limits.maxAmount;
  return `${min}–${max} ${code} per transfer`;
}

export function AnchorPanel() {
  const { address } = useWallet();
  const [info, setInfo] = useState<AnchorInfo | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [amount, setAmount] = useState("5");

  const { busy, transfer, started, failure, start, reset } =
    useAnchorTransfer();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/anchor", { cache: "no-store" });
        const body = (await response.json()) as AnchorInfo & { error?: string };
        if (cancelled) return;
        if (!response.ok)
          setInfoError(body.error ?? "the anchor could not be read");
        else setInfo(body);
      } catch (cause) {
        if (!cancelled) {
          setInfoError(
            cause instanceof Error
              ? cause.message
              : "the anchor could not be read",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const numeric = Number(amount);

  /** The wallet-level refusals; the amount ones come from `amountRefusal`. */
  const refuse = (limits: TransferLimits | undefined): string | null => {
    if (!address) return "Connect a wallet to use the fiat rail.";
    if (!limits || !info) return null;
    // The same pattern the route enforces, so the button cannot promise an
    // amount the server will refuse.
    if (!isTransferAmount(amount)) {
      return "Enter a plain decimal amount, like 5 or 5.50.";
    }
    return amountRefusal(limits, numeric, info.assetCode);
  };

  const run = (kind: TransferKind) => () => {
    if (info !== null) void start(kind, amount, info.protocol);
  };

  return (
    <section
      aria-labelledby="anchor-heading"
      className="ring-foreground/6.5 bg-card mt-10 rounded-xl p-6 shadow ring-1"
    >
      <h2
        id="anchor-heading"
        className="text-foreground flex items-center gap-2 text-lg font-semibold"
      >
        <ArrowDownToLine aria-hidden className="text-primary size-5" />
        Fiat in, fiat out
      </h2>

      {infoError !== null ? (
        <p className="text-muted-foreground mt-4 text-sm">
          The anchor could not be read, so nothing here can be offered right
          now. This is a failed read, not an anchor that is empty —{" "}
          <span className="font-address text-xs">{infoError}</span>
        </p>
      ) : info === null ? (
        <p className="text-muted-foreground mt-4 flex items-center gap-2 text-sm">
          <Loader2 aria-hidden className="size-4 animate-spin" />
          Asking the anchor what it will do…
        </p>
      ) : (
        <>
          <p className="text-muted-foreground mt-3 text-sm text-balance">
            Moving value across the boundary between a bank account and Stellar,
            through{" "}
            <a
              href={`https://${info.homeDomain}/.well-known/stellar.toml`}
              target="_blank"
              rel="noreferrer"
              className="text-foreground underline underline-offset-4"
            >
              {info.homeDomain}
            </a>{" "}
            over SEP-10 and {info.protocol === "sep24" ? "SEP-24" : "SEP-6"}.
            Your wallet authenticates by signing the anchor&apos;s challenge —
            this app verifies that the challenge is genuinely the anchor&apos;s
            before showing it to you, and holds no key of its own.
          </p>

          {/* The disclosure. Above the controls, not below them. */}
          {!info.fundsReserve && (
            <div className="border-destructive/25 bg-destructive/5 mt-5 rounded-lg border p-4">
              <p className="text-foreground flex items-start gap-2 text-sm font-medium">
                <TriangleAlert
                  aria-hidden
                  className="text-destructive mt-0.5 size-4 shrink-0"
                />
                A deposit here funds your wallet. It does not fund a reserve.
              </p>
              <p className="text-muted-foreground mt-2 text-sm text-balance">
                The anchor issues <Address value={info.issuer ?? "—"} /> and the
                deployed contracts hold{" "}
                <Address value={info.deploymentIssuer} />. Those are different
                assets, so the reserve vault cannot accept what arrives here
                until the contracts are redeployed against the anchor&apos;s
                asset. The rail below is real and the money is real; the last
                hop into a certificate is not wired yet, and this panel is not
                going to pretend it is.
              </p>
            </div>
          )}

          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-xs uppercase tracking-wide">
                Deposit
              </dt>
              <dd className="text-foreground mt-1 text-sm">
                {limitLabel(info.deposit, info.assetCode)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs uppercase tracking-wide">
                Withdraw
              </dt>
              <dd className="text-foreground mt-1 text-sm">
                {limitLabel(info.withdraw, info.assetCode)}
              </dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">
                Amount ({info.assetCode})
              </span>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="border-input bg-background text-foreground focus-visible:ring-ring w-32 rounded-md border px-3 py-2 font-address text-sm focus-visible:outline-none focus-visible:ring-2"
              />
            </label>

            <ActionButton
              gate={{ ok: true }}
              pending={busy}
              pendingLabel="Talking to the anchor…"
              reasonOverride={refuse(info.deposit)}
              onClick={run("deposit")}
            >
              <ArrowDownToLine aria-hidden className="size-4" />
              Deposit
            </ActionButton>

            <ActionButton
              gate={{ ok: true }}
              pending={busy}
              pendingLabel="Talking to the anchor…"
              reasonOverride={refuse(info.withdraw)}
              variant="outline"
              onClick={run("withdraw")}
            >
              <ArrowUpFromLine aria-hidden className="size-4" />
              Withdraw
            </ActionButton>
          </div>

          {failure !== null && (
            <div className="border-destructive/25 bg-destructive/5 mt-5 rounded-lg border p-4">
              <p className="text-foreground text-sm font-medium">
                {failure.message}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                {anchorFailureHint(failure)}
              </p>
            </div>
          )}

          {transfer !== null && (
            <div className="border-border mt-6 rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-foreground text-sm font-medium capitalize">
                  {transfer.kind || "transfer"} ·{" "}
                  {transfer.status.replace(/_/g, " ")}
                </p>
                <button
                  type="button"
                  onClick={reset}
                  className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-4"
                >
                  Clear
                </button>
              </div>

              <p className="text-muted-foreground mt-2 text-sm">
                {STATUS_COPY[transfer.status] ??
                  "The anchor reported a status this app does not have words for; its own window is authoritative."}
              </p>

              {transfer.message !== null && (
                <p className="text-muted-foreground mt-2 text-sm italic">
                  {transfer.message}
                </p>
              )}

              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">In</dt>
                  <dd className="font-address">{transfer.amountIn ?? "—"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Out</dt>
                  <dd className="font-address">{transfer.amountOut ?? "—"}</dd>
                </div>
              </dl>

              {/* The only field that proves money actually moved. */}
              <p
                className={cn(
                  "mt-3 text-sm",
                  transfer.stellarTransactionId ? "" : "text-muted-foreground",
                )}
              >
                {transfer.stellarTransactionId ? (
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${transfer.stellarTransactionId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-foreground inline-flex items-center gap-1.5 underline underline-offset-4"
                  >
                    On-chain transaction
                    <ExternalLink aria-hidden className="size-3.5" />
                  </a>
                ) : (
                  "No on-chain transaction yet — the anchor has not moved the asset."
                )}
              </p>

              {started?.url != null && (
                <p className="mt-3 text-sm">
                  <a
                    href={started.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-foreground inline-flex items-center gap-1.5 underline underline-offset-4"
                  >
                    Reopen the anchor&apos;s window
                    <ExternalLink aria-hidden className="size-3.5" />
                  </a>
                </p>
              )}

              {/*
                SEP-6 has no window to reopen: the next move happens at a bank.
                The anchor's words are relayed verbatim — this app does not know
                what a given bank needs, and a helpfully reworded payment
                instruction is a lost payment.
              */}
              {started?.instructions != null && (
                <div className="border-border bg-muted/40 mt-4 rounded-md border p-3">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">
                    What the anchor asks you to do
                  </p>
                  <p className="text-foreground font-address mt-2 whitespace-pre-wrap text-sm">
                    {started.instructions}
                  </p>
                </div>
              )}

              {started?.payTo != null && (
                <div className="border-border bg-muted/40 mt-4 rounded-md border p-3">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">
                    Send the asset here
                  </p>
                  <p className="mt-2 text-sm">
                    <Address value={started.payTo.account} />
                  </p>
                  {started.payTo.memo !== null && (
                    <p className="text-foreground mt-2 text-sm">
                      Memo{" "}
                      <span className="font-address">{started.payTo.memo}</span>
                      {started.payTo.memoType !== null && (
                        <span className="text-muted-foreground">
                          {" "}
                          ({started.payTo.memoType})
                        </span>
                      )}
                      . A withdrawal sent without it arrives as a payment the
                      anchor cannot attribute to you.
                    </p>
                  )}
                </div>
              )}

              {started?.moreInfoUrl != null && (
                <p className="mt-3 text-sm">
                  <a
                    href={started.moreInfoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-foreground inline-flex items-center gap-1.5 underline underline-offset-4"
                  >
                    This transfer at the anchor
                    <ExternalLink aria-hidden className="size-3.5" />
                  </a>
                </p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
