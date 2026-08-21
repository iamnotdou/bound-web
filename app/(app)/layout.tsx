import type { Metadata } from "next";
import { AppHeader } from "@/components/app/app-header";

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
  return (
    <>
      <AppHeader />
      <main className="bg-background flex-1">{children}</main>
      <footer className="border-border text-muted-foreground border-t py-6 text-center text-xs">
        Bound — a certificate proves committed capital, not good behaviour.
      </footer>
    </>
  );
}
