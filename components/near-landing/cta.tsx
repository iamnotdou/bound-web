import Link from "next/link";
import { ArrowLink } from "@/components/navy/arrow-link";
import { Button } from "@/components/navy/button";
import { CtaPanel } from "@/components/navy/cta-panel";
import { Section } from "@/components/navy/section";
import { NEAR_GITHUB_URL } from "@/lib/near/links";

/** The closing call to action on an inverse CtaPanel. */
export function Cta() {
  return (
    <Section aria-label="Get started">
      <CtaPanel
        tone="inverse"
        title={
          <>
            Check the cover <em>before it pays you</em>
          </>
        }
        text="Read-only, no wallet needed."
      >
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Button asChild variant="muted" className="w-fit">
            <Link href="/app/near">Open the app</Link>
          </Button>
          <ArrowLink asChild tone="inverse">
            <Link href="/docs">Docs</Link>
          </ArrowLink>
          <ArrowLink
            tone="inverse"
            href={NEAR_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Source on GitHub
          </ArrowLink>
        </div>
      </CtaPanel>
    </Section>
  );
}
