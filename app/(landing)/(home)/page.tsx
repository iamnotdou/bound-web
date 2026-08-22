import Link from "next/link";
import { PlatformFeatures } from "@/app/(landing)/(home)/sections/platform-features";
import { AnalyticsFeatures } from "@/app/(landing)/(home)/sections/analytics-features";
import { IntegrationsSection } from "@/app/(landing)/(home)/sections/integrations-section";
import { CallToAction } from "@/components/call-to-action";
import { Container } from "@/components/container";
import { CampaignIllustration } from "@/components/illustrations/campaign-illustration";
import { MessageIllustration } from "@/components/illustrations/message-illustration";
import { MessageCircle, Target } from "lucide-react";
import {
  FeatureCard,
  FeatureCardDescription,
  FeatureCardCIllustration,
  FeatureCardContent,
  FeatureCardTitle,
} from "@/components/ui/feature-card";
import { EnterpriseFeatures } from "@/app/(landing)/(home)/sections/enterprise-features";
import { PixelBlastBackground } from "@/components/pixel-blast-background";
import { buttonVariants } from "@/components/ui/button";
import { Stellar } from "@/components/ui/svgs/stellar";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <>
      <section id="home" className="overflow-hidden">
        <div className="relative">
          <Container asGrid className="relative">
            <div
              aria-hidden
              className="absolute inset-0 opacity-60 max-lg:opacity-30 2xl:mx-auto 2xl:max-w-7xl"
            >
              <PixelBlastBackground />
            </div>

            <div aria-hidden className="col-span-full grid grid-cols-10 gap-px">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="aspect-square">
                  <div data-grid-content />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-10 gap-px">
              <div aria-hidden className="@4xl:grid hidden grid-rows-4 gap-px">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i}>
                    <div data-grid-content />
                  </div>
                ))}
              </div>

              <div className="@4xl:col-span-8 col-span-full">
                <div
                  data-grid-content
                  className="bg-card! relative z-10 py-12 text-center"
                >
                  <div className="relative mx-auto max-w-3xl text-center">
                    <h1 className="text-foreground text-balance text-5xl font-semibold md:text-6xl">
                      Know your worst case{" "}
                      <span className="@max-md:hidden">
                        before you transact
                      </span>
                    </h1>
                    <p className="text-muted-foreground mb-9 mt-5 text-balance text-lg">
                      Bound is a surety bond for AI agents, on-chain. It
                      replaces &ldquo;can I trust this agent?&rdquo; with a
                      number you can look up: a pre-funded, auditor-staked
                      worst-case loss.
                    </p>

                    {/* Points at the first step of the flow rather than at the
                        listing: /app/new hands a wallet test XLM and test USDC
                        and then walks it through publish → fund. The listing is
                        still one click away for someone who only wants to look. */}
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <Link
                        className={cn(
                          buttonVariants({ size: "lg" }),
                          "text-sm",
                        )}
                        href="/app/new"
                      >
                        Bond your agent
                      </Link>
                      <Link
                        className={cn(
                          buttonVariants({ size: "lg", variant: "outline" }),
                          "text-sm",
                        )}
                        href="/app"
                      >
                        Browse bonded agents
                      </Link>
                    </div>
                    <span className="text-muted-foreground mt-3 flex items-center justify-center gap-1.5 text-center text-sm">
                      <Stellar className="size-3.5" />
                      Live on Stellar testnet — the wallet you connect is given
                      test XLM and test USDC to walk the whole flow.
                    </span>
                  </div>
                </div>
              </div>

              <div aria-hidden className="@4xl:grid hidden grid-rows-4 gap-px">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i}>
                    <div data-grid-content />
                  </div>
                ))}
              </div>
            </div>

            <div aria-hidden className="col-span-full grid grid-cols-10 gap-px">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="aspect-square">
                  <div data-grid-content />
                </div>
              ))}
            </div>
          </Container>

          <Container asGrid className="relative shadow-indigo-900/20">
            <h2 className="sr-only">Features</h2>
            <div className="@2xl:grid-cols-2 @4xl:grid-cols-10 grid gap-px">
              <div className="@max-4xl:hidden">
                <div data-grid-content />
              </div>
              <div className="@4xl:col-span-4">
                <FeatureCard>
                  <FeatureCardContent>
                    <FeatureCardTitle>
                      <Target className="size-4" />
                      Issue a Bond in Minutes
                    </FeatureCardTitle>
                    <FeatureCardDescription>
                      <span className="text-foreground">
                        Fund coverage for your agent and go live.
                      </span>{" "}
                      Set the worst-case amount, stake it, and publish it
                      on-chain.
                    </FeatureCardDescription>
                  </FeatureCardContent>
                  <FeatureCardCIllustration>
                    <CampaignIllustration />
                  </FeatureCardCIllustration>
                </FeatureCard>
              </div>
              <div className="@4xl:col-span-4">
                <FeatureCard>
                  <FeatureCardContent>
                    <FeatureCardTitle>
                      <MessageCircle className="size-4" />
                      Trust, Answered in One Message
                    </FeatureCardTitle>
                    <FeatureCardDescription>
                      <span className="text-foreground">
                        Any counterparty can check a bond before acting.
                      </span>{" "}
                      Humans and agents look up coverage by agent ID, instantly.
                    </FeatureCardDescription>
                  </FeatureCardContent>
                  <FeatureCardCIllustration>
                    <MessageIllustration />
                  </FeatureCardCIllustration>
                </FeatureCard>
              </div>
              <div className="@max-4xl:hidden">
                <div data-grid-content />
              </div>
            </div>
          </Container>
        </div>
      </section>
      <PlatformFeatures />
      <AnalyticsFeatures />
      <IntegrationsSection />
      <EnterpriseFeatures />
      <CallToAction />
    </>
  );
}
