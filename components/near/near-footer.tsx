import Link from "next/link";
import { LogoIcon } from "@/components/logo";
import { GitHubMark } from "@/components/near/near-header";
import { NEAR_GITHUB_URL, NEAR_NPM_URL } from "@/lib/near/links";

/** The footer of the NEAR-only site. States what the deploy is and is not. */
export function NearFooter() {
  return (
    <footer className="border-border bg-background border-t">
      <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xl space-y-2">
          <p className="text-foreground flex items-center gap-2 font-medium">
            <LogoIcon className="size-5" />
            Built at NEAR HACKATHON
          </p>
          <p className="text-xs text-balance">
            NEAR testnet only. Every token here is test money with no value, and
            the arbiter, treasury and contract keys are held by the author. A
            certificate proves committed capital, not good behaviour.
          </p>
        </div>
        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center gap-x-5 gap-y-2"
        >
          <Link href="/app/near" className="hover:text-foreground">
            App
          </Link>
          <Link href="/docs" className="hover:text-foreground">
            Docs
          </Link>
          <a href="/deck" className="hover:text-foreground">
            Deck
          </a>
          <a
            href={NEAR_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground inline-flex items-center gap-1.5"
          >
            <GitHubMark className="size-4" />
            GitHub
          </a>
          <a
            href={NEAR_NPM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground font-address"
          >
            @bound/near
          </a>
        </nav>
      </div>
    </footer>
  );
}
