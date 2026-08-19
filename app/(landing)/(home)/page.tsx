import Link from "next/link";
import { LogoCloud } from "@/components/logo-cloud";
import { Manifesto } from "@/app/(landing)/(home)/sections/manifesto";
import { PlatformFeatures } from "@/app/(landing)/(home)/sections/platform-features";
import { AnalyticsFeatures } from "@/app/(landing)/(home)/sections/analytics-features";
import { IntegrationsSection } from "@/app/(landing)/(home)/sections/integrations-section";
import { TestimonialsSection } from "@/app/(landing)/(home)/sections/testimonials-section";
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
import Image from "next/image";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <>
      <section id="home" className="overflow-hidden">
        <div className="relative">
          <Container asGrid className="relative">
            <div
              aria-hidden
              className="dither-xs mask-x-from-65% mask-x-to-95% mask-y-from-75% pointer-events-none absolute inset-0 opacity-40 max-lg:opacity-20 2xl:mx-auto 2xl:max-w-7xl"
            >
              <div className="size-full">
                <Image
                  src="https://raw.githubusercontent.com/tailark/assets/refs/heads/main/grid-2-bg_bqde4m.webp"
                  alt="tailark hero section background"
                  className="contrast-35 size-full -scale-x-100 object-cover brightness-75"
                  width={2224}
                  height={1589}
                  priority
                  fetchPriority="high"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1520px"
                />
              </div>
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
                <div data-grid-content className="py-12 text-center">
                  <div className="relative mx-auto max-w-3xl text-center">
                    <h1 className="text-foreground text-balance text-5xl font-semibold md:text-6xl">
                      <span className="@max-md:hidden">Modern</span> Solutions
                      for Customer Engagement
                    </h1>
                    <p className="text-muted-foreground mb-9 mt-5 text-balance text-lg">
                      Our comprehensive analytics and experimentation platform
                      empowers your team to make data-driven decisions.
                    </p>

                    <Link
                      className={cn(
                        buttonVariants({ size: "lg" }),
                        "text-sm shadow-xl shadow-indigo-900/40",
                      )}
                      href="#"
                    >
                      Start Testing for free
                    </Link>
                    <span className="text-muted-foreground mt-3 block text-center text-sm">
                      No credit card required!
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
            <div className="@2xl:grid-cols-2 @4xl:grid-cols-10 grid gap-px [--color-primary:var(--color-indigo-500)]">
              <div className="@max-4xl:hidden">
                <div data-grid-content />
              </div>
              <div className="@4xl:col-span-4">
                <FeatureCard>
                  <FeatureCardContent>
                    <FeatureCardTitle>
                      <Target className="size-4" />
                      Marketing Campaigns
                    </FeatureCardTitle>
                    <FeatureCardDescription>
                      <span className="text-foreground">
                        Launch and manage campaigns seamlessly.
                      </span>{" "}
                      Collaborate with your team to deliver impactful
                      strategies.
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
                      Collaborative Campaigns
                    </FeatureCardTitle>
                    <FeatureCardDescription>
                      <span className="text-foreground">
                        Work together for greater impact.
                      </span>{" "}
                      Engage with your team on comprehensive campaigns.
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
        <LogoCloud />
      </section>
      <Manifesto />
      <PlatformFeatures />
      <AnalyticsFeatures />
      <IntegrationsSection />
      <EnterpriseFeatures />
      <TestimonialsSection />
      <CallToAction />
    </>
  );
}
