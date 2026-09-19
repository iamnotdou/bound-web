import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AnchorPanel } from "@/components/app/anchor-panel";
import { WalletSetup } from "@/components/app/wallet-setup";

export const metadata: Metadata = {
  title: "Fiat rail",
  description:
    "Move value across the boundary between a bank account and Stellar, through a SEP-24 anchor, with the wallet authenticating over SEP-10.",
};

export default function FiatPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
      <Link
        href="/app"
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 rounded text-sm transition-colors focus-visible:outline-none focus-visible:ring-2"
      >
        <ArrowLeft aria-hidden className="size-4" />
        All bonded agents
      </Link>

      <header className="mt-6 max-w-2xl">
        <span className="text-muted-foreground font-mono text-xs uppercase tracking-widest">
          Anchor
        </span>
        <h1 className="text-foreground mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          The boundary the bond has to cross
        </h1>
        <p className="text-muted-foreground mt-3 text-balance">
          A surety bond is only worth what it can pay out in money somebody
          actually spends. That makes the anchor — the thing that turns a bank
          balance into a Stellar balance and back — load-bearing rather than a
          convenience, which is why it gets its own page instead of a button
          somewhere.
        </p>
      </header>

      <WalletSetup />

      <AnchorPanel />

      <section className="mt-10 max-w-2xl">
        <h2 className="text-foreground text-lg font-semibold">
          What is actually wired
        </h2>
        <ul className="text-muted-foreground mt-3 space-y-3 text-sm">
          <li>
            <strong className="text-foreground">SEP-1 discovery.</strong> No
            endpoint is written into this app. The anchor is one environment
            variable and every URL comes out of its{" "}
            <code className="font-address">stellar.toml</code>, so pointing at a
            lira anchor is a config change rather than a diff.
          </li>
          <li>
            <strong className="text-foreground">SEP-10 authentication.</strong>{" "}
            Your wallet signs the anchor&apos;s challenge. The server validates
            that challenge first — sequence zero, sourced by the key the anchor
            publishes, carrying the right home domain, already signed by the
            anchor — and refuses to show your wallet anything that fails. A
            wallet approval dialog is the last place that question should be
            settled.
          </li>
          <li>
            <strong className="text-foreground">
              SEP-24 deposit and withdraw.
            </strong>{" "}
            Both directions, because a reserve funded from fiat is half a rail
            if a proven claim cannot be paid back out to fiat.
          </li>
          <li>
            <strong className="text-foreground">
              The last hop is not wired.
            </strong>{" "}
            The deployed contracts hold a different USDC than this anchor
            issues, so a completed deposit lands in your wallet and stops there.
            The panel above says so rather than implying otherwise.
          </li>
        </ul>
      </section>
    </div>
  );
}
