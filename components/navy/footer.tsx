import { clsx } from "clsx";
import Link from "next/link";
import { ArrowLink } from "@/components/navy/arrow-link";
import { Button } from "@/components/navy/button";
import { GradientBackground } from "@/components/navy/gradient-shader";
import { grid, mainCol, sideCol } from "@/components/navy/grid";
import { LabeledGrid } from "@/components/navy/labeled-grid";
import { Logo } from "@/components/navy/logo";
import { Text } from "@/components/navy/text";
import { Wrapper } from "@/components/navy/wrapper";
import { NEAR_GITHUB_URL, NEAR_NPM_URL } from "@/lib/near/links";

/**
 * The footer of the NEAR site: the flipped shader rising from the bottom,
 * a closing call to action, the link columns and the testnet notice. Its
 * light top is `data-nav-clear`, its dark bottom half `data-nav-dark`.
 */
type FooterLink = {
  label: string;
  href: string;
  kind: "route" | "static" | "external";
};

const columns: { heading: string; links: FooterLink[] }[] = [
  {
    heading: "Product",
    links: [
      { label: "App", href: "/app/near", kind: "route" },
      { label: "Docs", href: "/docs", kind: "route" },
      { label: "Deck", href: "/deck", kind: "static" },
    ],
  },
  {
    heading: "Developers",
    links: [
      { label: "GitHub", href: NEAR_GITHUB_URL, kind: "external" },
      { label: "@bound/near on npm", href: NEAR_NPM_URL, kind: "external" },
    ],
  },
];

const columnLink =
  "rounded-sm text-sm text-inverse-foreground/60 transition-colors hover:text-inverse-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30";

function FooterAnchor({ link }: { link: FooterLink }) {
  if (link.kind === "route") {
    return (
      <Link href={link.href} className={columnLink}>
        {link.label}
      </Link>
    );
  }
  if (link.kind === "external") {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className={columnLink}
      >
        {link.label}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  return (
    <a href={link.href} className={columnLink}>
      {link.label}
    </a>
  );
}

export function Footer() {
  return (
    <footer data-nav-clear className="relative overflow-hidden">
      <GradientBackground variant="flip" />
      <div
        data-nav-dark
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1/2"
      />
      <Wrapper className="relative pt-24">
        <LabeledGrid label="NEAR testnet">
          <div className="grid gap-10 lg:grid-cols-9 lg:items-end lg:gap-x-8">
            <div className="lg:col-span-5">
              <Text
                tag="h2"
                variant="displayMD"
                className="text-foreground tracking-tight text-balance"
              >
                Built at <em>NEAR HACKATHON</em>
              </Text>
              <Text
                tag="p"
                variant="textBase"
                className="text-foreground mt-4 max-w-md text-pretty"
              >
                NEAR testnet only. Every token here is test money with no value,
                and the arbiter, treasury and contract keys are held by the
                author.
              </Text>
            </div>
            <div className="flex flex-wrap items-center gap-6 lg:col-span-4 lg:justify-end">
              <Button asChild variant="default" size="sm">
                <Link href="/app/near">Open the app</Link>
              </Button>
              <ArrowLink asChild>
                <Link href="/docs">Read the docs</Link>
              </ArrowLink>
            </div>
          </div>
        </LabeledGrid>
      </Wrapper>
      <Wrapper className="relative pt-40 pb-10">
        <div className={clsx("grid gap-y-12", grid)}>
          <div className={sideCol}>
            <Text
              tag="p"
              variant="textXS"
              className="text-inverse-foreground/80 uppercase"
            >
              NEAR testnet only
            </Text>
          </div>
          <nav
            aria-label="Footer"
            className={clsx("grid grid-cols-2 gap-10 md:grid-cols-4", mainCol)}
          >
            {columns.map((column) => (
              <div key={column.heading}>
                <Text
                  tag="h3"
                  variant="textSM"
                  className="text-inverse-foreground font-medium"
                >
                  {column.heading}
                </Text>
                <ul role="list" className="mt-4 flex flex-col gap-3">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <FooterAnchor link={link} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div
          className={clsx(
            "border-inverse-foreground/10 mt-16 grid items-center gap-y-4 border-t pt-8",
            grid,
          )}
        >
          <Link
            href="/"
            className={clsx(
              "focus-visible:ring-primary/30 inline-flex w-fit rounded-sm focus-visible:ring-3 focus-visible:outline-none",
              sideCol,
            )}
          >
            <span className="sr-only">Bound on NEAR, home</span>
            <Logo className="text-inverse-foreground" aria-hidden />
          </Link>
          <Text
            tag="p"
            variant="textXS"
            className={clsx("text-inverse-foreground/50 text-pretty", mainCol)}
          >
            A certificate proves committed capital, not good behaviour.
          </Text>
        </div>
      </Wrapper>
    </footer>
  );
}
