import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  AuditorConsole,
  type AwaitingCert,
} from "@/components/app/auditor-console";
import { WalletSetup } from "@/components/app/wallet-setup";
import { getCertificateFacts, listCertificatePage } from "@/lib/bound";
import { deriveCertState } from "@/lib/cert-state";
import { nowUnix } from "@/lib/clock";

// Chain state on a timer, like the rest of the app group. The wallet's own
// book is fetched client-side, because a cached balance is somebody else's.
export const revalidate = 30;

export const metadata: Metadata = {
  title: "Auditor",
  description:
    "Stake slashable capital, see what is free, and attest certificates whose reserves are actually funded.",
};

/**
 * Which certificates an auditor could act on right now.
 *
 * "Funded" is read from the reserve vault, not from the certificate's claimed
 * `reserve_amount` — the two disagree often enough that this is the whole point
 * of the milestone. Only the first page is scanned: this is a work queue, not
 * an index, and a queue that costs a hundred RPC round trips to render is one
 * nobody waits for.
 */
async function awaitingAttestation(): Promise<{
  items: AwaitingCert[];
  scanned: number;
  total: number;
}> {
  const page = await listCertificatePage(1);
  const now = nowUnix();

  const candidates = page.items.filter(
    (cert) => cert.status === "Pending" && cert.auditor === null,
  );

  const checked = await Promise.all(
    candidates.map(async (cert) => {
      const facts = await getCertificateFacts(cert.certId);
      if (!facts || facts.reserve.vaultStroops === null) return null;
      const state = deriveCertState(facts, now);
      if (state.nextStep !== "attest") return null;
      return {
        cert,
        claimedStroops: facts.reserve.claimedStroops,
        vaultStroops: facts.reserve.vaultStroops,
      } satisfies AwaitingCert;
    }),
  );

  return {
    items: checked.filter((item): item is AwaitingCert => item !== null),
    scanned: page.items.length,
    total: page.total,
  };
}

export default async function AuditorPage() {
  const { items, scanned, total } = await awaitingAttestation();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
      <Link
        href="/app"
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 rounded text-sm transition-colors focus-visible:outline-none focus-visible:ring-2"
      >
        <ArrowLeft aria-hidden className="size-4" />
        All bonded agents
      </Link>

      <header className="mt-6 max-w-2xl">
        <span className="text-muted-foreground font-mono text-xs uppercase tracking-widest">
          Auditor
        </span>
        <h1 className="text-foreground mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Stake, and vouch for something
        </h1>
        <p className="text-muted-foreground mt-3 text-balance">
          An auditor is the party that puts its own money behind somebody
          else&apos;s certificate. Staking costs you nothing but the deposit;
          attesting is where capital actually goes at risk, and where a slash
          can take it.
        </p>
      </header>

      <WalletSetup />

      <AuditorConsole awaiting={items} />

      <p className="text-muted-foreground mt-6 text-xs text-balance">
        The queue above was built by checking the {scanned} newest of {total}{" "}
        certificates against the reserve vault. Older ones are not scanned —
        open a certificate directly to attest it.
      </p>
    </div>
  );
}
