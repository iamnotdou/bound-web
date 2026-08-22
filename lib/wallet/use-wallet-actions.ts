"use client";

/**
 * The build → sign → submit round trip, with the stage kept attached to every
 * failure. "The contract refused to build this", "you declined in your wallet"
 * and "the network rejected the signed transaction" are three different things
 * that a user has to act on differently, so they never collapse into one
 * message here.
 */
import { useCallback } from "react";
import { TransactionBuilder } from "@stellar/stellar-sdk";
import type { GateCode } from "@/lib/preconditions";
import { localJournal } from "@/lib/tx-journal";
import type { AppAction } from "@/lib/tx";
import { useWallet } from "./wallet-provider";

export type ActionStage = "connect" | "build" | "sign" | "submit";

/**
 * The actions this app asks the server to build.
 *
 * Derived from `AppAction` rather than written out again, so an action the
 * build endpoint stops accepting cannot survive here as a string that compiles.
 */
export type ClientAction = Extract<
  AppAction,
  "publish" | "challenge" | "trustline" | "deposit" | "stake" | "attest"
>;

export class WalletActionError extends Error {
  readonly stage: ActionStage;
  /**
   * The precondition this failure maps onto, when the server recognised it.
   * Absent means unrecognised — and then `raw` is the only true thing there is
   * to show, so the UI shows it labelled as raw rather than dressing it up.
   */
  readonly code?: GateCode;
  /** The contract's or host's own unedited words. Always kept. */
  readonly raw?: string;
  /**
   * The hash of the envelope that was signed, when there was one.
   *
   * A `submit` failure with a hash is not a rejection: it is a transaction
   * whose fate is not known yet, and the journal is what finds out.
   */
  readonly hash?: string;

  constructor(
    stage: ActionStage,
    message: string,
    detail?: { code?: GateCode; raw?: string; hash?: string },
  ) {
    super(message);
    this.name = "WalletActionError";
    this.stage = stage;
    this.code = detail?.code;
    this.raw = detail?.raw;
    this.hash = detail?.hash;
  }
}

async function postJson<T>(
  url: string,
  body: unknown,
  stage: ActionStage,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new WalletActionError(
      stage,
      "Could not reach the server. Check your connection and try again.",
    );
  }

  const data = (await response.json().catch(() => null)) as
    (T & { error?: string; code?: GateCode; raw?: string }) | null;

  if (!response.ok) {
    throw new WalletActionError(
      stage,
      data?.error ?? `Request failed with status ${response.status}.`,
      { code: data?.code, raw: data?.raw },
    );
  }
  if (!data) {
    throw new WalletActionError(
      stage,
      "The server returned an empty response.",
    );
  }
  return data;
}

/** A wallet rejection is a user decision, not a fault — say so precisely. */
function signatureError(error: unknown): WalletActionError {
  const message = error instanceof Error ? error.message : String(error);
  const declined = /reject|declin|denied|cancel|user/i.test(message);
  return new WalletActionError(
    "sign",
    declined
      ? "The signature was declined in your wallet. Nothing was submitted."
      : `Your wallet could not sign this transaction: ${message}`,
  );
}

export interface ActionOutcome {
  hash: string;
  /** Decoded contract return value: the cert id, the challenge id, or null. */
  result: unknown;
}

export function useWalletActions() {
  const { address, signXdr } = useWallet();

  const run = useCallback(
    async (
      action: ClientAction,
      params: Record<string, unknown>,
    ): Promise<ActionOutcome> => {
      if (!address) {
        throw new WalletActionError(
          "connect",
          "Connect a wallet before submitting this transaction.",
        );
      }

      const { xdr, networkPassphrase } = await postJson<{
        xdr: string;
        networkPassphrase: string;
      }>("/api/tx/build", { action, address, params }, "build");

      let signed: string;
      try {
        signed = await signXdr(xdr, networkPassphrase);
      } catch (error) {
        throw signatureError(error);
      }

      // The hash is a property of the signed envelope, so it is knowable
      // *before* the network sees it. Writing it down first is the whole point:
      // `/api/tx/submit` gives up polling after thirty seconds, and a
      // transaction that lands at thirty-one used to be reported as rejected.
      const hash = TransactionBuilder.fromXDR(signed, networkPassphrase)
        .hash()
        .toString("hex");

      localJournal.put({
        hash,
        action,
        certId: typeof params.certId === "number" ? params.certId : null,
        address,
        submittedAtUnix: Math.floor(Date.now() / 1000),
      });

      try {
        const outcome = await postJson<ActionOutcome>(
          "/api/tx/submit",
          { xdr: signed },
          "submit",
        );
        localJournal.settle(outcome.hash, "success");
        return outcome;
      } catch (error) {
        // Deliberately *not* settled as failed. The submit route throws on its
        // own timeout as well as on a real rejection, and it cannot tell them
        // apart. The journal asks the chain instead.
        if (error instanceof WalletActionError && error.stage === "submit") {
          throw new WalletActionError(error.stage, error.message, {
            code: error.code,
            raw: error.raw,
            hash,
          });
        }
        throw error;
      }
    },
    [address, signXdr],
  );

  return { address, run };
}

/** The decoded return value as a positive integer id, when it is one. */
export function asId(result: unknown): number | null {
  if (typeof result === "number" && Number.isSafeInteger(result) && result >= 0)
    return result;
  if (typeof result === "bigint" && result >= BigInt(0)) return Number(result);
  if (typeof result === "string" && /^\d+$/.test(result)) return Number(result);
  return null;
}
