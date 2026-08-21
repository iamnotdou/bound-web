import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { PublishCertificateForm } from "@/components/app/publish-certificate-form";

export const metadata: Metadata = {
  title: "Publish a certificate",
  description:
    "Publish a pending certificate for a bonded agent. It records a claimed reserve; it does not move or lock any money.",
};

export default function PublishCertificatePage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
      <Link
        href="/app"
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 rounded text-sm transition-colors focus-visible:outline-none focus-visible:ring-2"
      >
        <ArrowLeft aria-hidden className="size-4" />
        All bonded agents
      </Link>

      <header className="mt-6">
        <span className="text-muted-foreground font-mono text-xs uppercase tracking-widest">
          Publish
        </span>
        <h1 className="text-foreground mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Publish a certificate
        </h1>
        <p className="text-muted-foreground mt-3 text-balance">
          Your connected wallet signs and pays for the transaction that writes a
          new certificate into the registry on Stellar testnet.
        </p>
      </header>

      <section
        aria-labelledby="honesty-heading"
        className="ring-foreground/6.5 bg-card mt-8 rounded-xl p-6 shadow ring-1"
      >
        <h2
          id="honesty-heading"
          className="text-foreground flex items-center gap-2 text-base font-semibold"
        >
          <ShieldAlert aria-hidden className="text-primary size-5" />
          What this form actually does
        </h2>
        <ul className="text-muted-foreground mt-4 space-y-3 text-sm">
          <li>
            <strong className="text-foreground">
              No money moves and nothing is locked.
            </strong>{" "}
            Publishing records a <em>claimed</em> reserve as a number on the
            certificate. Your wallet is debited for the network fee and nothing
            else.
          </li>
          <li>
            <strong className="text-foreground">
              You cannot fund that reserve.
            </strong>{" "}
            On the contracts deployed today,{" "}
            <code className="font-address">ReserveVault.deposit</code>{" "}
            authenticates against a single operator address fixed at
            initialization. Any other publisher — including you — is refused. So
            the claimed reserve stays a claim.
          </li>
          <li>
            <strong className="text-foreground">
              The certificate lands as Pending.
            </strong>{" "}
            Unfunded, and unattested until a registered auditor stakes slashable
            capital behind it. Pending is not cover, and a counterparty should
            not treat it as any.
          </li>
        </ul>
        <p className="text-muted-foreground mt-4 text-sm text-balance">
          This is the protocol&apos;s current state on testnet, stated plainly
          rather than implied. A certificate published here is a public,
          verifiable claim — nothing more.
        </p>
      </section>

      <h2 className="text-foreground mt-10 text-lg font-semibold">
        Certificate terms
      </h2>
      <PublishCertificateForm />
    </div>
  );
}
