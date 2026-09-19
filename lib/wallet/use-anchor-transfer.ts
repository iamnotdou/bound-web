"use client";

/**
 * Authenticate with the anchor, open a transfer, and watch what becomes of it.
 *
 * The same three-stage shape as `use-wallet-actions`, for the same reason:
 * "the anchor would not issue a challenge", "you declined the signature" and
 * "the transfer never completed" are three different things a person has to act
 * on differently, and collapsing them into one message helps nobody.
 *
 * The SEP-10 token lives in this hook's state and nowhere else — not in
 * localStorage, not in a cookie. It is a bearer token for one account at one
 * anchor, it expires on its own, and a page refresh costing one extra signature
 * is a better trade than a token sitting in storage on a shared laptop.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "./wallet-provider";

export type AnchorStage = "connect" | "authenticate" | "sign" | "open" | "poll";

export class AnchorError extends Error {
  readonly stage: AnchorStage;
  constructor(stage: AnchorStage, message: string) {
    super(message);
    this.name = "AnchorError";
    this.stage = stage;
  }
}

export interface AnchorTransaction {
  id: string;
  kind: string;
  status: string;
  amountIn: string | null;
  amountOut: string | null;
  stellarTransactionId: string | null;
  message: string | null;
}

export type TransferKind = "deposit" | "withdraw";

/**
 * SEP-24 statuses that mean the anchor is finished with this transfer, either
 * way. Polling stops here; anything else is still moving.
 */
const TERMINAL = new Set(["completed", "refunded", "expired", "error"]);

export interface AnchorTransferState {
  busy: boolean;
  transfer: AnchorTransaction | null;
  /** The anchor's hosted form, while it is the thing to go and do. */
  interactiveUrl: string | null;
  failure: AnchorError | null;
  start: (kind: TransferKind, amount?: string) => Promise<void>;
  reset: () => void;
}

/** Raised when the anchor rejects the session token rather than the request. */
class TokenRejected extends Error {}

async function json<T>(
  url: string,
  init: RequestInit,
  stage: AnchorStage,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, cache: "no-store" });
  } catch {
    throw new AnchorError(
      stage,
      "Could not reach the server. Check your connection.",
    );
  }
  const body = (await response.json().catch(() => null)) as
    (T & { error?: string }) | null;
  if (!response.ok || !body) {
    const message =
      body?.error ?? `The request failed with status ${response.status}.`;
    // SEP-10 tokens expire. The anchor answers 401/403, and our route relays
    // that inside a 502 with the status in the text — so both the direct code
    // and the relayed one have to count, or an expired session wedges the flow
    // until the page is reloaded.
    if (
      response.status === 401 ||
      response.status === 403 ||
      /\b(401|403)\b/.test(message)
    ) {
      throw new TokenRejected(message);
    }
    throw new AnchorError(stage, message);
  }
  return body;
}

/**
 * Everything one authenticated wallet has going at the anchor.
 *
 * It carries the address it belongs to, and is only handed back while that
 * still matches the connected wallet — the same shape `use-wallet-facts` uses,
 * for the same reason. A SEP-10 token authenticates exactly one account, so a
 * wallet switch must invalidate it, and deriving that from the address is
 * honest where clearing it inside an effect would leave a render in between
 * showing one wallet's transfer under another's name.
 */
interface Session {
  address: string;
  transfer: AnchorTransaction | null;
  interactiveUrl: string | null;
}

export function useAnchorTransfer(): AnchorTransferState {
  const { address, signXdr } = useWallet();
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [failure, setFailure] = useState<AnchorError | null>(null);

  // In a ref, not in state: it is a credential, and nothing should re-render
  // because of it. Keyed by address for the same reason the session is.
  //
  // Deliberately not surfaced as an `authenticated` flag either. Reading a ref
  // during render is exactly the thing that does not re-render, so a flag
  // derived from it would go stale silently — and no caller needs it: `start`
  // authenticates on demand, and one signature prompt is the honest signal that
  // a session was needed.
  const token = useRef<{ address: string; value: string } | null>(null);

  const fresh =
    session !== null && session.address === address ? session : null;
  const transfer = fresh?.transfer ?? null;
  const interactiveUrl = fresh?.interactiveUrl ?? null;
  const reset = useCallback(() => {
    setSession(null);
    setFailure(null);
  }, []);

  const authenticate = useCallback(async (): Promise<string> => {
    if (token.current?.address === address && address)
      return token.current.value;
    if (!address) {
      throw new AnchorError(
        "connect",
        "Connect a wallet before using the fiat rail.",
      );
    }

    // The server validated this challenge against the anchor's declared signing
    // key before returning it. That check is the reason it is safe to put in
    // front of a wallet at all — see lib/anchor.ts.
    const challenge = await json<{ xdr: string; networkPassphrase: string }>(
      `/api/anchor/auth?address=${encodeURIComponent(address)}`,
      { method: "GET" },
      "authenticate",
    );

    let signed: string;
    try {
      signed = await signXdr(challenge.xdr, challenge.networkPassphrase);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new AnchorError(
        "sign",
        /reject|declin|denied|cancel|user/i.test(message)
          ? "The signature was declined in your wallet. Nothing was sent to the anchor."
          : `Your wallet could not sign the anchor's challenge: ${message}`,
      );
    }

    const { token: issued } = await json<{ token: string }>(
      "/api/anchor/auth",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ signedXdr: signed }),
      },
      "authenticate",
    );

    token.current = { address, value: issued };
    return issued;
  }, [address, signXdr]);

  const poll = useCallback(async (owner: string, id: string) => {
    const bearer = token.current;
    if (!bearer || bearer.address !== owner) return;
    try {
      const next = await json<AnchorTransaction>(
        `/api/anchor/transfer/${encodeURIComponent(id)}`,
        { method: "GET", headers: { authorization: `Bearer ${bearer.value}` } },
        "poll",
      );
      // Keyed by owner, so a poll that lands after a wallet switch updates
      // nothing rather than writing one wallet's transfer into another's view.
      setSession((current) =>
        current !== null && current.address === owner
          ? { ...current, transfer: next }
          : current,
      );
    } catch (error) {
      // A failed poll is not a failed transfer, so the last known state stands
      // rather than being replaced by an error. But a rejected token would
      // otherwise make every future poll fail in silence, so it is dropped —
      // the next action re-authenticates.
      if (error instanceof TokenRejected) token.current = null;
    }
  }, []);

  const start = useCallback(
    async (kind: TransferKind, amount?: string) => {
      setBusy(true);
      setFailure(null);

      // Opened synchronously, inside the click, while the user activation is
      // still live. By the time the anchor answers there have been two round
      // trips and a wallet prompt, and Safari and Firefox block a popup opened
      // that late — so the window is claimed now and pointed at the anchor once
      // there is somewhere to point it. A blocked popup still degrades safely:
      // `interactiveUrl` is rendered as a link either way.
      const popup = window.open(
        "about:blank",
        "_blank",
        "width=480,height=680",
      );

      try {
        const bearer = await authenticate();
        if (!address) throw new AnchorError("connect", "No wallet connected.");

        const open = (bearerToken: string) =>
          json<{ id: string; url: string }>(
            "/api/anchor/transfer",
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                token: bearerToken,
                kind,
                account: address,
                amount,
              }),
            },
            "open",
          );

        let opened: { id: string; url: string };
        try {
          opened = await open(bearer);
        } catch (error) {
          if (!(error instanceof TokenRejected)) throw error;
          // Expired session: drop it, authenticate once more, try once more.
          // Exactly once — a loop here would prompt the wallet forever against
          // an anchor that rejects every token.
          token.current = null;
          opened = await open(await authenticate());
        }

        setSession({
          address,
          interactiveUrl: opened.url,
          transfer: {
            id: opened.id,
            kind,
            status: "incomplete",
            amountIn: null,
            amountOut: null,
            stellarTransactionId: null,
            message: null,
          },
        });

        // The anchor's own hosted form. A popup, never an iframe: it is where a
        // real anchor collects identity documents, and framing somebody else's
        // KYC page inside our origin is not a layout decision.
        if (popup && !popup.closed) popup.location.replace(opened.url);
        else window.open(opened.url, "_blank", "noopener,noreferrer");
      } catch (error) {
        // Nothing to show it: close the window we claimed rather than leaving a
        // blank tab behind.
        if (popup && !popup.closed) popup.close();
        if (error instanceof TokenRejected) token.current = null;
        setFailure(
          error instanceof AnchorError
            ? error
            : new AnchorError(
                "open",
                error instanceof Error ? error.message : String(error),
              ),
        );
      } finally {
        setBusy(false);
      }
    },
    [address, authenticate],
  );

  // Poll while a transfer is in flight. Five seconds: the anchor is a human
  // filling in a form, not a block producer.
  useEffect(() => {
    const owner = fresh?.address;
    const current = fresh?.transfer;
    if (!owner || !current || TERMINAL.has(current.status)) return;
    const timer = setInterval(() => void poll(owner, current.id), 5_000);
    return () => clearInterval(timer);
  }, [fresh, poll]);

  return {
    busy,
    transfer,
    interactiveUrl,
    failure,
    start,
    reset,
  };
}

/** What each stage means for the money, said plainly. */
export function anchorFailureHint(failure: AnchorError): string {
  switch (failure.stage) {
    case "connect":
      return "Connect a wallet in the header, then try again.";
    case "authenticate":
      return "Nothing was signed and no money moved. The anchor either did not answer or answered with something this app refused to show your wallet.";
    case "sign":
      return "Nothing was sent to the anchor and no money moved.";
    case "open":
      return "The anchor did not open a transfer. Nothing has been started.";
    case "poll":
      return "The transfer exists; this app just could not read its status. Reopen the anchor's window to check.";
  }
}
