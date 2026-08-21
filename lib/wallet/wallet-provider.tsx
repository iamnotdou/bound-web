"use client";

/**
 * Wallet connection state, shared across the app route group.
 *
 * Browser-only by construction: the kit is never touched during render, only
 * inside effects and event handlers, so the server render and the static
 * prerender of `/app` produce the disconnected shell and hydrate from there.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ensureKit } from "./kit";

const STORAGE_KEY = "bound:wallet-connected";

interface WalletContextValue {
  address: string | null;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  /** Sign an unsigned envelope under the passphrase the server built it for. */
  signXdr: (xdr: string, networkPassphrase: string) => Promise<string>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Best-effort silent restore. The kit remembers the selected wallet module,
  // so if the extension still has a live session it hands the address back
  // without prompting. A failure here just means "not connected".
  useEffect(() => {
    if (!window.localStorage.getItem(STORAGE_KEY)) return;
    let cancelled = false;

    (async () => {
      try {
        const { address: restored } = await ensureKit().getAddress();
        if (cancelled) return;
        if (restored) setAddress(restored);
        else window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        if (!cancelled) window.localStorage.removeItem(STORAGE_KEY);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const { address: connected } = await ensureKit().authModal();
      setAddress(connected);
      window.localStorage.setItem(STORAGE_KEY, "1");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setAddress(null);
    window.localStorage.removeItem(STORAGE_KEY);
    try {
      await ensureKit().disconnect();
    } catch {
      // Modules without a disconnect concept: clearing local state is enough.
    }
  }, []);

  const signXdr = useCallback(
    async (xdr: string, networkPassphrase: string) => {
      const { signedTxXdr } = await ensureKit().signTransaction(xdr, {
        address: address ?? undefined,
        networkPassphrase,
      });
      return signedTxXdr;
    },
    [address],
  );

  return (
    <WalletContext.Provider
      value={{ address, connecting, connect, disconnect, signXdr }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const value = useContext(WalletContext);
  if (!value) {
    throw new Error("useWallet must be used inside <WalletProvider>");
  }
  return value;
}
