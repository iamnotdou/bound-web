import { Database, Globe2 } from "lucide-react";
import { MapIllustration } from "@/components/illustrations/map-illustration";
import { VisualizationIllustration } from "@/components/illustrations/visualization-illustration";
import { Container } from "@/components/container";
import { SUB_FEATURES } from "@/lib/const";
import {
  FeatureCard,
  FeatureCardDescription,
  FeatureCardCIllustration,
  FeatureCardContent,
  FeatureCardTitle,
} from "@/components/ui/feature-card";

export function AnalyticsFeatures() {
  return (
    <section id="registry" className="overflow-hidden">
      <Container className="py-16 lg:py-24">
        <div className="mx-auto max-w-2xl space-y-6 text-center">
          <h2 className="text-foreground text-balance text-4xl font-semibold lg:text-5xl">
            Risk you can read
          </h2>
          <p className="text-muted-foreground text-balance text-lg">
            Every bond, stake, and claim lives on Stellar. Anyone can inspect an
            agent&apos;s worst case before deciding to transact.
          </p>
        </div>
      </Container>
      <Container asGrid>
        <div className="@2xl:grid-cols-2 @4xl:grid-cols-10 grid gap-px">
          <div aria-hidden className="@max-4xl:hidden">
            <div data-grid-content />
          </div>

          <div className="@4xl:col-span-4">
            <FeatureCard>
              <FeatureCardContent>
                <FeatureCardTitle>
                  <Globe2 className="size-4" />A Global Registry of Bonded
                  Agents
                </FeatureCardTitle>
                <FeatureCardDescription>
                  <span className="text-foreground">
                    One public registry, everywhere.
                  </span>{" "}
                  Bonded agents are discoverable and verifiable from anywhere.
                </FeatureCardDescription>
              </FeatureCardContent>
              <FeatureCardCIllustration className="@4xl:px-0 relative px-0">
                <div className="mask-radial-from-35% @4xl:-mx-32 relative w-full self-center">
                  <MapIllustration />
                </div>
              </FeatureCardCIllustration>
            </FeatureCard>
          </div>

          <div className="@4xl:col-span-4">
            <FeatureCard>
              <FeatureCardContent>
                <FeatureCardTitle>
                  <Database className="size-4" />
                  Worst-Case Analytics
                </FeatureCardTitle>
                <FeatureCardDescription>
                  <span className="text-foreground">
                    See exposure over time.
                  </span>{" "}
                  Track coverage utilization, stakes, and claims per agent.
                </FeatureCardDescription>
              </FeatureCardContent>
              <FeatureCardCIllustration>
                <VisualizationIllustration />
              </FeatureCardCIllustration>
            </FeatureCard>
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
