"use client";

import { Check, Copy, LogOut, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { truncateAddress } from "@/components/app/address";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/lib/wallet/wallet-provider";

export function ConnectWalletButton() {
  const { address, connecting, connect, disconnect } = useWallet();
  const [copied, setCopied] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  if (!address) {
    return (
      <div className="flex flex-col items-end">
        <Button
          size="sm"
          onClick={async () => {
            setFailure(null);
            try {
              await connect();
            } catch (error) {
              setFailure(
                error instanceof Error
                  ? error.message
                  : "Could not connect a wallet.",
              );
            }
          }}
          disabled={connecting}
        >
          <Wallet aria-hidden />
          {connecting ? "Connecting…" : "Connect wallet"}
        </Button>
        {failure ? (
          <p role="alert" className="text-destructive mt-1 max-w-60 text-xs">
            {failure}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span
        title={address}
        className="ring-foreground/6.5 bg-card font-address inline-flex h-8 items-center gap-2 rounded-md px-2.5 text-xs shadow-sm ring-1"
      >
        <Wallet aria-hidden className="text-primary size-3.5" />
        <span className="sr-only">Connected wallet </span>
        {truncateAddress(address, 4)}
      </span>
      <Button
        size="icon"
        variant="ghost"
        className="size-8"
        aria-label={copied ? "Address copied" : "Copy wallet address"}
        onClick={() => {
          navigator.clipboard
            .writeText(address)
            .then(() => setCopied(true))
            .catch(() => setCopied(false));
        }}
      >
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="size-8"
        aria-label="Disconnect wallet"
        onClick={() => void disconnect()}
      >
        <LogOut aria-hidden />
      </Button>
    </div>
  );
}
