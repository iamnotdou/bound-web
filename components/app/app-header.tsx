import Link from "next/link";
import { ArrowLeft, Banknote, Landmark, Plus } from "lucide-react";
import { ConnectWalletButton } from "@/components/app/connect-wallet-button";
import { Logo } from "@/components/logo";

export function AppHeader() {
  return (
    <header className="bg-background/80 border-border sticky top-0 z-40 w-full border-b backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/app" aria-label="Bound marketplace">
          <Logo />
        </Link>

        <nav
          aria-label="Marketplace"
          className="flex items-center gap-2 sm:gap-4"
        >
          <Link
            href="/app/new"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 rounded text-sm transition-colors focus-visible:outline-none focus-visible:ring-2"
          >
            <Plus aria-hidden className="size-4" />
            <span className="hidden sm:inline">Publish a certificate</span>
            <span className="sm:hidden">Publish</span>
          </Link>
          <Link
            href="/app/auditor"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 rounded text-sm transition-colors focus-visible:outline-none focus-visible:ring-2"
          >
            <Landmark aria-hidden className="size-4" />
            <span className="hidden sm:inline">Auditor console</span>
            <span className="sm:hidden">Auditor</span>
          </Link>
          <Link
            href="/app/fiat"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 rounded text-sm transition-colors focus-visible:outline-none focus-visible:ring-2"
          >
            <Banknote aria-hidden className="size-4" />
            <span className="hidden sm:inline">Fiat rail</span>
            <span className="sm:hidden">Fiat</span>
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
      </div>
    </header>
  );
}
