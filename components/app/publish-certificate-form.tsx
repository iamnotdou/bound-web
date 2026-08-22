"use client";

import { useId, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { revalidateMarketplace } from "@/app/(app)/app/actions";
import { ActionButton, ActionFailure } from "@/components/app/action-button";
import { isAccountId } from "@/components/app/stellar-address";
import {
  asId,
  useWalletActions,
  WalletActionError,
  type ActionStage,
} from "@/lib/wallet/use-wallet-actions";
import { useWallet } from "@/lib/wallet/wallet-provider";
import { useWalletFacts } from "@/lib/wallet/use-wallet-facts";
import {
  depositFailureCopy,
  useFundReserve,
} from "@/lib/wallet/use-fund-reserve";
import { formatUsdcExact } from "@/components/app/usdc";
import type { Gate } from "@/lib/preconditions";
import { cn } from "@/lib/utils";

interface Fields {
  agent: string;
  boundUsd: string;
  reserveUsd: string;
  expiryDays: string;
}

type FieldErrors = Partial<Record<keyof Fields, string>>;

const EMPTY: Fields = {
  agent: "",
  boundUsd: "",
  reserveUsd: "",
  expiryDays: "30",
};

/** Titles for the three ways this can fail, kept distinct on purpose. */
const STAGE_TITLE: Record<ActionStage, string> = {
  connect: "No wallet connected",
  build: "The transaction could not be built",
  sign: "The transaction was not signed",
  submit: "The network rejected the transaction",
};

const STAGE_HINT: Record<ActionStage, string> = {
  connect: "Connect a wallet from the header, then submit again.",
  build:
    "Nothing was signed and nothing was sent. The message above comes from the contract simulation, so the certificate would have been rejected on-chain.",
  sign: "Nothing was sent. You can submit again to get a fresh signing prompt.",
  submit:
    "The envelope was signed but did not make it on-chain. Submitting again builds a new transaction; check the marketplace first in case this one did land.",
};

/** The gate before the wallet endpoint has anything to say about it. */
const NO_WALLET: Gate = {
  ok: false,
  code: "no-wallet",
  reason: "Connect a wallet in the header to sign this transaction.",
};

function positiveNumber(raw: string): number | null {
  if (!/^\d+(\.\d+)?$/.test(raw.trim())) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

// `agent` is not a user-editable field any more: v2 authenticates the agent as
// well as the operator, and a browser wallet holds one key, so the wallet can
// only bond itself. It is validated as the connected address rather than as
// form input.
function validate(fields: Fields, agent: string | null): FieldErrors {
  const errors: FieldErrors = {};

  if (!agent) {
    errors.agent = "Connect a wallet to bond it as the agent.";
  } else if (!isAccountId(agent)) {
    errors.agent = "The connected wallet is not a Stellar account id.";
  }

  if (positiveNumber(fields.boundUsd) === null) {
    errors.boundUsd = "Enter the bound as a positive amount in US dollars.";
  }

  const reserve = positiveNumber(fields.reserveUsd);
  const bound = positiveNumber(fields.boundUsd);
  if (reserve === null) {
    errors.reserveUsd =
      "Enter the claimed reserve as a positive amount in US dollars.";
  } else if (bound !== null && reserve > bound) {
    errors.reserveUsd =
      "The reserve cannot exceed the bound — the bound is the ceiling.";
  }

  const days = positiveNumber(fields.expiryDays);
  if (days === null || !Number.isInteger(days)) {
    errors.expiryDays = "Enter a whole number of days.";
  }

  return errors;
}

export function PublishCertificateForm() {
  const ids = {
    agent: useId(),
    boundUsd: useId(),
    reserveUsd: useId(),
    expiryDays: useId(),
  };
  const { address } = useWallet();
  const { run } = useWalletActions();
  const { gates, loading: readingWallet } = useWalletFacts();

  const [fields, setFields] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showErrors, setShowErrors] = useState(false);
  const [failure, setFailure] = useState<WalletActionError | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    hash: string;
    certId: number | null;
  } | null>(null);
  const [, startTransition] = useTransition();

  const set = (key: keyof Fields) => (value: string) => {
    const next = { ...fields, [key]: value };
    setFields(next);
    if (showErrors) setErrors(validate(next, address));
  };

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate(fields, address);
    setErrors(found);
    setShowErrors(true);
    if (Object.keys(found).length > 0) return;

    setFailure(null);
    setResult(null);
    setBusy(true);
    try {
      const outcome = await run("publish", {
        // v2: the wallet bonds itself; see the Agent address field.
        agent: address,
        boundUsd: Number(fields.boundUsd),
        reserveUsd: Number(fields.reserveUsd),
        expiryDays: Number(fields.expiryDays),
      });
      const certId = asId(outcome.result);
      setResult({ hash: outcome.hash, certId });
      startTransition(() => {
        void revalidateMarketplace(certId);
      });
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

  if (result) {
    return (
      <PublishedStep
        hash={result.hash}
        certId={result.certId}
        claimedUsd={Number(fields.reserveUsd)}
        onPublishAnother={() => {
          setResult(null);
          setFields(EMPTY);
          setShowErrors(false);
          setErrors({});
        }}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-8">
      <div className="ring-foreground/6.5 bg-card grid gap-5 rounded-xl p-6 shadow ring-1">
        <Field
          id={ids.agent}
          label="Agent address"
          hint="This wallet. The registry authenticates the agent as well as the operator, and a browser wallet holds one key — so it can only bond itself. Naming a different agent needs that agent's signature in the same transaction."
          error={showErrors ? errors.agent : undefined}
        >
          {(props) => (
            <input
              {...props}
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              readOnly
              placeholder="Connect a wallet"
              value={address ?? ""}
              className={inputClass(
                showErrors && errors.agent,
                "font-address opacity-80",
              )}
            />
          )}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id={ids.boundUsd}
            label="Bound (USD)"
            hint="The ceiling: the maximum loss this certificate would cover."
            error={showErrors ? errors.boundUsd : undefined}
          >
            {(props) => (
              <input
                {...props}
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                placeholder="50000"
                value={fields.boundUsd}
                onChange={(event) => set("boundUsd")(event.target.value)}
                className={inputClass(showErrors && errors.boundUsd)}
              />
            )}
          </Field>

          <Field
            id={ids.reserveUsd}
            label="Claimed reserve (USD)"
            hint="Recorded on the certificate as a claim. No money moves."
            error={showErrors ? errors.reserveUsd : undefined}
          >
            {(props) => (
              <input
                {...props}
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                placeholder="10000"
                value={fields.reserveUsd}
                onChange={(event) => set("reserveUsd")(event.target.value)}
                className={inputClass(showErrors && errors.reserveUsd)}
              />
            )}
          </Field>
        </div>

        <Field
          id={ids.expiryDays}
          label="Expires in (days)"
          hint="After this, the certificate binds nothing."
          error={showErrors ? errors.expiryDays : undefined}
        >
          {(props) => (
            <input
              {...props}
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={fields.expiryDays}
              onChange={(event) => set("expiryDays")(event.target.value)}
              className={cn(
                inputClass(showErrors && errors.expiryDays),
                "sm:max-w-40",
              )}
            />
          )}
        </Field>
      </div>

      {failure ? (
        <ActionFailure
          title={STAGE_TITLE[failure.stage]}
          message={failure.message}
          raw={failure.raw}
          recognised={failure.code !== undefined}
          action="publish"
          hint={STAGE_HINT[failure.stage]}
        />
      ) : null}

      <div className="mt-6">
        <ActionButton
          type="submit"
          gate={address ? (gates?.publish ?? null) : NO_WALLET}
          checking={Boolean(address) && readingWallet}
          pending={busy}
        >
          Publish certificate
        </ActionButton>
        <p className="text-muted-foreground mt-2 text-sm">
          Your connected wallet signs as the publishing operator, and pays only
          the network fee.
        </p>
      </div>
    </form>
  );
}

function inputClass(invalid: string | false | undefined, extra?: string) {
  return cn(
    "bg-background ring-foreground/10 focus-visible:ring-ring h-10 w-full rounded-md px-3 text-sm shadow-sm ring-1 transition focus-visible:outline-none focus-visible:ring-2",
    invalid && "ring-destructive/60 focus-visible:ring-destructive",
    extra,
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint: string;
  error?: string;
  children: (props: {
    id: string;
    "aria-describedby": string;
    "aria-invalid"?: true;
  }) => React.ReactNode;
}) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="text-foreground block text-sm font-medium">
        {label}
      </label>
      <p id={hintId} className="text-muted-foreground mb-1.5 mt-1 text-xs">
        {hint}
      </p>
      {children({
        id,
        "aria-describedby": error ? `${hintId} ${errorId}` : hintId,
        ...(error ? { "aria-invalid": true as const } : {}),
      })}
      {error ? (
        <p id={errorId} className="text-destructive mt-1.5 text-xs">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Step two, in the same session.
 *
 * A certificate published here lands Pending with an empty vault, and until
 * somebody funds it no auditor can attest it — so the success card is not the
 * end of anything. It shows the gap between the claim and the vault, reads
 * both live rather than assuming the vault is empty because the certificate is
 * new, and offers the deposit as the next step. "Later" stays available: the
 * same button is on the certificate's own page whenever the operator comes
 * back.
 */
function PublishedStep({
  hash,
  certId,
  claimedUsd,
  onPublishAnother,
}: {
  hash: string;
  certId: number | null;
  claimedUsd: number;
  onPublishAnother: () => void;
}) {
  const { address } = useWallet();
  const { gates, cert, loading, refresh } = useWalletFacts(certId);
  const { fund, busy, hash: fundHash, failure } = useFundReserve(refresh);

  const shortfall = cert?.reserveShortfallStroops ?? null;
  const funded = cert !== null && cert.nextStep !== "fund";

  return (
    <section
      aria-labelledby="published-heading"
      className="ring-primary/30 bg-card mt-8 rounded-xl p-6 shadow ring-1"
    >
      <h2
        id="published-heading"
        className="text-foreground flex items-center gap-2 text-lg font-semibold"
      >
        <CheckCircle2 aria-hidden className="text-primary size-5" />
        Certificate published — now fund it
      </h2>
      <p className="text-muted-foreground mt-2 text-balance text-sm">
        It is on-chain as <strong className="text-foreground">Pending</strong>:
        the reserve you entered is a claim recorded against the certificate, not
        money that moved. An auditor cannot attest a certificate whose reserve
        is not funded, so this is the step that decides whether it ever becomes
        anything.
      </p>

      <dl className="divide-border mt-4 divide-y">
        <div className="flex flex-wrap items-center justify-between gap-2 py-3">
          <dt className="text-muted-foreground text-sm">Transaction hash</dt>
          <dd className="font-address min-w-0 break-all text-right text-sm">
            {hash}
          </dd>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 py-3">
          <dt className="text-muted-foreground text-sm">Certificate ID</dt>
          <dd className="font-address text-right text-sm">
            {certId === null ? "not returned" : `#${certId}`}
          </dd>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 py-3">
          <dt className="text-muted-foreground text-sm">
            Reserve held / claimed
          </dt>
          <dd className="text-right text-sm tabular-nums">
            {cert === null ? (
              <span className="text-muted-foreground">
                {loading ? "reading the vault…" : "not read yet"}
              </span>
            ) : (
              <>
                <strong className="text-foreground">
                  {cert.vaultStroops === null
                    ? "unreadable"
                    : formatUsdcExact(cert.vaultStroops)}
                </strong>{" "}
                <span className="text-muted-foreground">
                  / {formatUsdcExact(cert.claimedStroops)}
                </span>
              </>
            )}
          </dd>
        </div>
      </dl>

      {certId !== null && !funded ? (
        <div className="mt-4">
          <ActionButton
            gate={address ? (gates?.fund ?? null) : NO_WALLET}
            checking={Boolean(address) && loading}
            pending={busy}
            onClick={() => {
              if (shortfall === null) return;
              void fund(certId, shortfall);
            }}
            reasonOverride={
              shortfall === null && cert !== null
                ? "The vault balance could not be read, so there is no shortfall to fund. Reload and try again."
                : null
            }
          >
            {shortfall !== null
              ? `Fund the reserve — ${formatUsdcExact(shortfall)}`
              : `Fund the reserve — $${claimedUsd.toLocaleString("en-US")}`}
          </ActionButton>
        </div>
      ) : null}

      {funded ? (
        <p className="text-foreground mt-4 text-sm">
          The vault now holds what this certificate claims. The next step is an
          auditor&apos;s, not yours.
        </p>
      ) : null}

      {fundHash ? (
        <p role="status" className="text-foreground mt-4 text-sm">
          Deposit submitted —{" "}
          <span className="font-address break-all">{fundHash}</span>. The
          figures above are re-read from the chain.
        </p>
      ) : null}

      {failure ? (
        <ActionFailure
          title={depositFailureCopy(failure).title}
          message={failure.message}
          raw={failure.raw}
          recognised={failure.code !== undefined}
          action="deposit"
          certId={certId}
          hint={depositFailureCopy(failure).hint}
        />
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-4">
        {certId !== null ? (
          <Link
            href={`/app/cert/${certId}`}
            className="text-primary text-sm font-medium hover:underline"
          >
            View certificate #{certId}
          </Link>
        ) : null}
        <Link
          href="/app"
          className="text-muted-foreground text-sm font-medium hover:underline"
        >
          Later — back to the marketplace
        </Link>
        <button
          type="button"
          onClick={onPublishAnother}
          className="text-muted-foreground text-sm font-medium hover:underline"
        >
          Publish another
        </button>
      </div>
    </section>
  );
}
