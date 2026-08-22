import { ShieldQuestion } from "lucide-react";
import { DEMO_AUDITOR } from "@/lib/deployment";
import { cn } from "@/lib/utils";

/**
 * The disclosure that goes wherever boundprotocol.dev's own auditor account
 * appears as a certificate's auditor.
 *
 * The point of an auditor is that it is somebody else. This one is not — it is
 * the same party that runs this site, staking its own test capital so a
 * stranger can watch a certificate reach Verified without waiting for a real
 * third party to show up. That is a useful demonstration and a bad
 * attestation, and the difference is not something to leave to the reader to
 * work out from an address.
 *
 * It applies to the seeded certificates too: #1 and #3–#5 on testnet were all
 * attested by exactly this address.
 *
 * There is deliberately no badge, seal or verification mark anywhere near it.
 */
export function DemoAuditorNote({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <span
        className={cn(
          "bg-muted text-muted-foreground ring-foreground/10 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1",
          className,
        )}
        title="Operated by boundprotocol.dev — not an independent third party"
      >
        boundprotocol.dev&apos;s own auditor
      </span>
    );
  }

  return (
    <aside
      className={cn(
        "ring-foreground/10 bg-muted/40 rounded-xl p-5 ring-1",
        className,
      )}
    >
      <h3 className="text-foreground flex items-center gap-2 text-sm font-semibold">
        <ShieldQuestion aria-hidden className="size-4" />
        This certificate&apos;s auditor is ours
      </h3>
      <p className="text-muted-foreground mt-2 text-sm text-balance">
        <span className="font-address break-all">{DEMO_AUDITOR}</span> is
        operated by boundprotocol.dev — the same party that runs this site. Its
        stake is real testnet capital and it is genuinely slashable, so the
        mechanism you are looking at is working exactly as it would with anyone
        else&apos;s money.
      </p>
      <p className="text-muted-foreground mt-2 text-sm text-balance">
        It is <strong className="text-foreground">not</strong> an independent
        third party, and an attestation from it is not evidence that anybody
        outside this project examined the agent. Treat it as a demonstration of
        the flow, not as a second opinion.
      </p>
    </aside>
  );
}
