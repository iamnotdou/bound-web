import { clsx } from "clsx";
import Link from "next/link";
import { ArrowLink } from "@/components/navy/arrow-link";
import { Button } from "@/components/navy/button";
import { GradientBackground } from "@/components/navy/gradient-shader";
import { grid, mainCol, mainStart } from "@/components/navy/grid";
import { Text } from "@/components/navy/text";
import { Wrapper } from "@/components/navy/wrapper";

/**
 * Navy's landing hero: a full-height shader arch with the white headline
 * centred on the main column, and a second row at the bottom with the
 * description and the calls to action.
 */
export function Hero({ agent }: { agent: string }) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden"
    >
      <div className="flex min-h-svh flex-col">
        <GradientBackground />
        <div
          data-nav-dark
          data-nav-start="dark"
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1/2"
        />
        <Wrapper
          className={clsx(
            "relative grid w-full flex-1 content-center pt-40 pb-16",
            grid,
          )}
        >
          <div className={clsx("min-w-0", mainCol, mainStart)}>
            <Text
              tag="p"
              variant="textXS"
              className="text-inverse-foreground/75 uppercase"
            >
              NEAR testnet, built at NEAR HACKATHON
            </Text>
            <Text
              tag="h1"
              id="hero-heading"
              variant="displayLG"
              className="text-inverse-foreground mt-6 max-w-2xl tracking-tight text-balance"
            >
              Know a NEAR agent&apos;s <em>worst case</em> before you deal with
              it
            </Text>
          </div>
        </Wrapper>
        <Wrapper
          className={clsx(
            "relative flex w-full flex-col justify-between gap-6 pb-10 sm:flex-row sm:items-end lg:grid",
            grid,
          )}
        >
          <div className={clsx("max-w-md lg:col-span-5", mainStart)}>
            <Text
              tag="p"
              variant="textSM"
              className="text-muted-foreground text-pretty"
            >
              Bound is a surety bond for AI agents. It replaces &ldquo;can I
              trust this agent?&rdquo; with a number anyone can look up: a
              pre-funded reserve plus an auditor&apos;s slashable stake, behind
              an agent account whose only key can call nothing but a metered{" "}
              <span className="text-foreground font-medium">pay</span>.
            </Text>
            <Text
              tag="p"
              variant="textXS"
              className="text-muted-foreground mt-3 text-pretty"
            >
              Read-only, no wallet needed. Every live figure on this page is a
              view call, refreshed about every 15 seconds.
            </Text>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 lg:col-span-4 lg:justify-self-end">
            <Button asChild size="sm" className="w-fit">
              <Link href={`/app/near?agent=${agent}`}>Verify an agent</Link>
            </Button>
            <ArrowLink asChild>
              <Link href="/docs">Read the docs</Link>
            </ArrowLink>
            <ArrowLink href="/deck">See the deck</ArrowLink>
          </div>
        </Wrapper>
      </div>
    </section>
  );
}
