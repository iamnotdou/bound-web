import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Bound — A surety bond for AI agents, on-chain",
  description:
    "Know your worst case before you transact. Bound replaces \u201ccan I trust this agent?\u201d with a number you can look up: a pre-funded, auditor-staked worst-case loss, verifiable on Stellar.",
};

export default function LandingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      <main className="bg-background">
        <div className="bg-foreground/3">{children}</div>
      </main>
      <Footer />
    </>
  );
}
