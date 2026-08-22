"use client";

/**
 * The deposit mutation, shared by the certificate page's reserve panel and by
 * the publish form's second step.
 *
 * Publishing and funding are one session in the flow the app is built around,
 * so the button that appears right after a certificate lands has to be the
 * same button as the one on its page — same gate, same amount arithmetic, same
 * refresh afterwards. Two copies of it would drift, and the copy that drifted
 * would be the one that told somebody their reserve was funded when it was not.
 */
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useWalletActions,
  WalletActionError,
} from "@/lib/wallet/use-wallet-actions";

export interface FundReserve {
  fund: (certId: number, amountStroops: string) => Promise<void>;
  busy: boolean;
  hash: string | null;
  failure: WalletActionError | null;
  reset: () => void;
}

export function useFundReserve(onSettled?: () => void): FundReserve {
  const router = useRouter();
  const { run } = useWalletActions();
  const [busy, setBusy] = useState(false);
  const [hash, setHash] = useState<string | null>(null);
  const [failure, setFailure] = useState<WalletActionError | null>(null);

  const reset = useCallback(() => {
    setHash(null);
    setFailure(null);
  }, []);

  const fund = useCallback(
    async (certId: number, amountStroops: string) => {
      setBusy(true);
      setFailure(null);
      try {
        const outcome = await run("deposit", { certId, amountStroops });
        setHash(outcome.hash);
        onSettled?.();
        // The page shell is a cached server render of chain facts. Re-reading
        // it is the only way the new vault balance appears; guessing at it
        // locally is how a UI ends up claiming a deposit that failed.
        router.refresh();
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
    },
    [onSettled, router, run],
  );

  return { fund, busy, hash, failure, reset };
}

/** The three ways a deposit fails, kept apart because they differ in what moved. */
export function depositFailureCopy(failure: WalletActionError): {
  title: string;
  hint: string;
} {
  switch (failure.stage) {
    case "connect":
      return {
        title: "No wallet connected",
        hint: "Connect the operator's wallet in the header, then try again.",
      };
    case "build":
      return {
        title: "The deposit could not be built",
        hint: "Nothing was signed and no money moved. The message above comes from the chain's own simulation of this deposit.",
      };
    case "sign":
      return {
        title: "The deposit was not signed",
        hint: "Nothing was sent and no money moved.",
      };
    case "submit":
      return {
        title: "The deposit did not land",
        hint: "The envelope was signed. Re-read the certificate before retrying, in case the deposit landed after all.",
      };
  }
}
