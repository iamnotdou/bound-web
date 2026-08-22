"use client";

/**
 * The connected wallet's side of the picture.
 *
 * The server render cannot know which wallet is connected, and `/app` is
 * cached for everyone, so this is the one thing the browser has to ask for
 * itself. It asks a single `no-store` endpoint that returns both the facts and
 * every gate derived from them, so the button and the sentence under it can
 * never come from two different reads.
 *
 * The snapshot carries the address and certificate it was read for, and is
 * only handed back when both still match. That is what keeps a balance from
 * one wallet being shown under another after a switch — and it means the
 * effect never has to null the state out synchronously to stay honest.
 *
 * `refresh()` is what an action calls once it lands: re-reading the wallet is
 * cheaper and more truthful than guessing at the new balance locally.
 */
import { useCallback, useEffect, useState } from "react";
import type { ActionKey, Gate } from "@/lib/preconditions";
import type { CertStatusTag } from "@/lib/bound";
import type { Lifecycle } from "@/lib/cert-state";
import type { WalletFacts } from "@/lib/wallet-facts";
import { useWallet } from "./wallet-provider";

/**
 * The certificate the gates were computed against, as the wallet endpoint
 * returns it. Not `CertFacts`: that type is shaped for the server render, and
 * this is the flattened slice a client panel needs to show a live balance
 * beside a claim.
 */
export interface CertSnapshot {
  certId: number;
  status: CertStatusTag;
  auditor: string | null;
  operator: string | null;
  expiresAtUnix: number;
  claimedStroops: string;
  /** null means the vault did not answer. It never means zero. */
  vaultStroops: string | null;
  allocationSnapshotStroops: string;
  allocationLiveStroops: string | null;
  lifecycle: Lifecycle;
  nextStep: "fund" | "attest" | "none";
  reserveShortfallStroops: string | null;
  reserveFundedRatio: number | null;
  demoAuditor: boolean;
}

interface Snapshot {
  address: string;
  certId: number | null;
  facts: WalletFacts | null;
  gates: Record<ActionKey, Gate> | null;
  cert: CertSnapshot | null;
  error: string | null;
}

export interface WalletSnapshot {
  facts: WalletFacts | null;
  gates: Record<ActionKey, Gate> | null;
  /** The queried certificate, read live by the same request. */
  cert: CertSnapshot | null;
  /** True while there is a connected wallet but no read for it yet. */
  loading: boolean;
  /** Horizon or the server did not answer. Not "the wallet holds nothing". */
  error: string | null;
  refresh: () => void;
}

export function useWalletFacts(certId?: number | null): WalletSnapshot {
  const { address } = useWallet();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [nonce, setNonce] = useState(0);

  const key = certId ?? null;
  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;

    void (async () => {
      const query = key === null ? "" : `?certId=${key}`;
      try {
        const response = await fetch(`/api/wallet/${address}${query}`, {
          cache: "no-store",
        });
        const body = (await response.json()) as {
          facts?: WalletFacts;
          gates?: Record<ActionKey, Gate>;
          cert?: CertSnapshot | null;
          error?: string;
        };
        if (cancelled) return;
        setSnapshot(
          response.ok && body.facts && body.gates
            ? {
                address,
                certId: key,
                facts: body.facts,
                gates: body.gates,
                cert: body.cert ?? null,
                error: null,
              }
            : {
                address,
                certId: key,
                facts: null,
                gates: null,
                cert: null,
                error:
                  body.error ??
                  `this wallet could not be read (${response.status})`,
              },
        );
      } catch (cause) {
        if (cancelled) return;
        setSnapshot({
          address,
          certId: key,
          facts: null,
          gates: null,
          cert: null,
          error:
            cause instanceof Error
              ? cause.message
              : "this wallet could not be read",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address, key, nonce]);

  const fresh =
    snapshot && snapshot.address === address && snapshot.certId === key
      ? snapshot
      : null;

  return {
    facts: fresh?.facts ?? null,
    gates: fresh?.gates ?? null,
    cert: fresh?.cert ?? null,
    loading: Boolean(address) && fresh === null,
    error: fresh?.error ?? null,
    refresh,
  };
}
