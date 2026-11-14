import type { Metadata } from "next";
import { AppHeader } from "@/components/app/app-header";
import { PendingTransactions } from "@/components/app/pending-transactions";
import { Footer } from "@/components/navy/footer";
import { Navigation } from "@/components/navy/navigation";
import { NEAR_ONLY } from "@/lib/site";
import { WalletProvider } from "@/lib/wallet/wallet-provider";

export const metadata: Metadata = {
  title: {
    default: "Marketplace",
    template: "%s — Bound Marketplace",
  },
  description:
    "Browse bonded AI agents, see whether they are verified and for how much, and inspect the certificate behind the number.",
};

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // The NEAR-only deploy serves nothing in this group but `/app/near/*`,
  // which is read-only, so it gets the NEAR shell and no pending-transaction
  // tray. The provider stays: the redirected Stellar pages still prerender.
  if (NEAR_ONLY) {
    return (
      <WalletProvider>
        <Navigation />
        <main data-navy-main className="bg-background relative flex-1">
          {children}
        </main>
        <Footer />
      </WalletProvider>
    );
  }
  return (
    <WalletProvider>
      <AppHeader />
      <main className="bg-background flex-1">
        <div className="px-4 sm:px-6">
          <PendingTransactions />
        </div>
        {children}
      </main>
      <footer className="border-border text-muted-foreground border-t py-6 text-center text-xs">
        Bound — a certificate proves committed capital, not good behaviour.
      </footer>
    </WalletProvider>
  );
}
