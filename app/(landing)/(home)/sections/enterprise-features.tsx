import { Check, TrendingUp } from "lucide-react";
import { Container } from "@/components/container";
import { FeatureCard, FeatureCardContent } from "@/components/ui/feature-card";
import Link from "next/link";
import { EnterpriseMessageIllustration } from "@/components/illustrations/enterprise-message-illustration";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SUB_FEATURES } from "@/lib/const";

export function EnterpriseFeatures() {
  return (
    <section id="enterprise">
      <Container className="py-16 lg:py-24">
        <div className="mx-auto max-w-2xl space-y-6 text-center">
          <h2 className="text-foreground text-balance text-4xl font-semibold lg:text-5xl">
            Underwriting for the Agent Economy
          </h2>
          <p className="text-muted-foreground text-balance text-lg">
            Bond entire fleets of agents with custom coverage, backed by auditor
            stakes and settled on Stellar.
          </p>
        </div>
      </Container>
      <Container asGrid>
        <div className="@2xl:grid-cols-2 @4xl:grid-cols-10 grid gap-px">
          <div aria-hidden className="@max-4xl:hidden">
            <div data-grid-content />
          </div>
          <div className="@4xl:col-span-4">
            <FeatureCard className="@4xl:col-span-2 col-span-full grid-rows-1">
              <FeatureCardContent className="@4xl:pb-12 flex h-full flex-col space-y-6">
                <div className="bg-card ring-foreground/3 flex size-12 rounded-full shadow-xl shadow-black/5 ring-1">
                  <TrendingUp className="text-muted-foreground m-auto size-4" />
                </div>
                <h3 className="text-3xl font-semibold">Scale to Infinity</h3>
                <p className="text-muted-foreground text-balance">
                  From one agent to a fleet of thousands — every one carries its
                  own verifiable worst case, so your risk never outruns your
                  coverage.
                </p>
                <ul className="w-full space-y-2">
                  {[
                    "Fleet bonding with shared coverage pools",
                    "Custom coverage tiers per agent role",
                    "Auditor marketplace for attestations",
                  ].map((feature, index) => (
                    <li
                      key={index}
                      className="text-muted-foreground flex items-center gap-2"
                    >
                      <Check className="size-4 text-emerald-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "mt-auto w-fit",
                  )}
                  href="/docs"
                >
                  Learn more
                </Link>
              </FeatureCardContent>
            </FeatureCard>
          </div>
          <div className="@4xl:col-span-4">
            <EnterpriseMessageIllustration />
          </div>
          <div aria-hidden className="@max-4xl:hidden">
            <div data-grid-content />
          </div>
        </div>
      </Container>
      <Container
        asGrid
        className="@4xl:**:data-grid-content:p-8 **:data-grid-content:p-6 @5xl:**:data-grid-content:p-12 @4xl:grid-cols-10 grid-cols-2"
      >
        <div aria-hidden className="@max-4xl:hidden">
          <div data-grid-content />
        </div>
        <div className="@4xl:grid-cols-3 @sm:grid-cols-2 col-span-8 grid gap-px">
          {SUB_FEATURES.map((feature, index) => (
            <div key={index} className="@4xl:last:hidden">
              <div data-grid-content className="space-y-3">
                <feature.icon className="size-4" />
                <h3 className="mt-3 font-medium">{feature.title}</h3>
                <p className="text-muted-foreground line-clamp-2 text-sm">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div aria-hidden className="@max-4xl:hidden">
          <div data-grid-content />
        </div>
      </Container>
    </section>
  );
}
