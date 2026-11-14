"use client";

/**
 * The `(app)` header's navigation. On `/app/near/*` it shows only the NEAR
 * pages: the Stellar marketplace links and the Stellar wallet button would
 * send a NEAR visitor into a different chain's app, so they are replaced by
 * a read-only NEAR badge. Every other route keeps the Stellar app as is.
 * On the NEAR-only deploy the link back to the main site is dropped too.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Banknote, Landmark, Plus, ShieldCheck } from "lucide-react";
import { ConnectWalletButton } from "@/components/app/connect-wallet-button";
import { isNearRoute } from "@/lib/near/route";
import { NEAR_ONLY } from "@/lib/site";

export function HomeLink({ children }: { children: React.ReactNode }) {
  const near = isNearRoute(usePathname());
  return (
    <Link
      href={near ? "/app/near" : "/app"}
      aria-label={near ? "Bound on NEAR testnet" : "Bound marketplace"}
    >
      {children}
    </Link>
  );
}

export function AppNav() {
  if (isNearRoute(usePathname())) return <NearNav />;
  return (
    <nav aria-label="Marketplace" className="flex items-center gap-2 sm:gap-4">
      <Link
        href="/app/near"
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 rounded text-sm transition-colors focus-visible:outline-none focus-visible:ring-2"
      >
        <ShieldCheck aria-hidden className="size-4" />
        <span className="hidden sm:inline">NEAR testnet</span>
        <span className="sr-only">NEAR</span>
      </Link>
      <Link
        href="/app/new"
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 rounded text-sm transition-colors focus-visible:outline-none focus-visible:ring-2"
      >
        <Plus aria-hidden className="size-4" />
        <span className="hidden sm:inline">Publish a certificate</span>
        <span className="sr-only sm:hidden">Publish</span>
      </Link>
      <Link
        href="/app/auditor"
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 rounded text-sm transition-colors focus-visible:outline-none focus-visible:ring-2"
      >
        <Landmark aria-hidden className="size-4" />
        <span className="hidden sm:inline">Auditor console</span>
        <span className="sr-only sm:hidden">Auditor</span>
      </Link>
      <Link
        href="/app/fiat"
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 rounded text-sm transition-colors focus-visible:outline-none focus-visible:ring-2"
      >
        <Banknote aria-hidden className="size-4" />
        <span className="hidden sm:inline">Fiat rail</span>
        <span className="sr-only sm:hidden">Fiat</span>
      </Link>
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground hidden items-center gap-1.5 text-sm transition-colors md:inline-flex"
      >
        <ArrowLeft aria-hidden className="size-4" />
        boundprotocol.dev
      </Link>
      <ConnectWalletButton />
    </nav>
  );
}

function NearNav() {
  return (
    <nav aria-label="NEAR testnet" className="flex items-center gap-2 sm:gap-4">
      <Link
        href="/app/near"
        className="ring-primary/30 text-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 focus-visible:outline-none focus-visible:ring-2"
      >
        <ShieldCheck aria-hidden className="text-primary size-4" />
        NEAR testnet, read-only
      </Link>
      {NEAR_ONLY ? null : (
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground hidden items-center gap-1.5 text-sm transition-colors md:inline-flex"
        >
          <ArrowLeft aria-hidden className="size-4" />
          boundprotocol.dev
        </Link>
      )}
    </nav>
  );
}
