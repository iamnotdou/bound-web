"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CloudOff, RotateCw } from "lucide-react";

/**
 * Error boundary for the whole app route group.
 *
 * Every page here reads certificates from Soroban RPC, so the realistic failure
 * is a network one. That must not be rendered as an empty marketplace: "no
 * bonded agents exist" and "we could not reach the chain" are different claims,
 * and showing the first when the second is true would be a lie about the
 * protocol's state. So the read is allowed to throw and is caught here.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("app route error:", error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-24 text-center sm:px-6">
      <div className="bg-muted/60 mx-auto grid size-11 place-items-center rounded-full">
        <CloudOff aria-hidden className="text-muted-foreground size-5" />
      </div>
      <h1 className="text-foreground mt-4 text-2xl font-semibold">
        Could not reach the network
      </h1>
      <p className="text-muted-foreground mt-2 text-balance">
        Certificates are read live from the chain, so this page has nothing to
        show until the connection comes back. Nothing is wrong with the
        certificates themselves.
      </p>
      <div className="mt-5 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
        >
          <RotateCw aria-hidden className="size-3.5" />
          Try again
        </button>
        <Link
          href="/app"
          className="text-muted-foreground text-sm font-medium hover:underline"
        >
          Back to the marketplace
        </Link>
      </div>
      {error.digest ? (
        <p className="text-muted-foreground/70 font-address mt-6 text-xs">
          ref {error.digest}
        </p>
      ) : null}
    </div>
  );
}
