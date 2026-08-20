import Link from "next/link";
import { Container, Separator } from "@/components/container";
import { FeatureCard, FeatureCardContent } from "@/components/ui/feature-card";
import { buttonVariants } from "@/components/ui/button";
import { LogoIcon } from "@/components/logo";
import { cn } from "@/lib/utils";
import { GitPullRequestArrow, MessageCircle } from "lucide-react";

const SquareBand = () => (
  <div aria-hidden className="col-span-full grid grid-cols-10 gap-px">
    {Array.from({ length: 10 }).map((_, i) => (
      <div key={i} className="aspect-square">
        <div data-grid-content />
      </div>
    ))}
  </div>
);

export default function Contact() {
  return (
    <section id="contact">
      <Container asGrid className="relative">
        <SquareBand />

        <div className="grid grid-cols-10 gap-px">
          <div aria-hidden className="@4xl:grid hidden grid-rows-4 gap-px">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div data-grid-content />
              </div>
            ))}
          </div>

          <div className="@4xl:col-span-8 col-span-full">
            <div data-grid-content className="bg-card! relative z-10 py-12">
              <div className="mx-auto max-w-3xl px-6 text-center">
                <h1 className="text-foreground text-balance text-5xl font-semibold md:text-6xl">
                  Get in touch
                </h1>
                <p className="text-muted-foreground mt-5 text-balance text-lg">
                  Bound is built and maintained by one person. Questions, bug
                  reports and ideas all reach the same inbox.
                </p>
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

        <SquareBand />
      </Container>

      <Separator className="h-24" />

      <Container asGrid className="@4xl:grid-cols-4 grid-cols-2">
        <FeatureCard className="@4xl:col-span-2 col-span-full grid-rows-1">
          <FeatureCardContent className="@4xl:pb-12 flex h-full flex-col space-y-6">
            <div className="bg-card ring-foreground/3 flex size-12 rounded-full shadow-xl shadow-black/5 ring-1">
              <MessageCircle className="text-muted-foreground m-auto size-4" />
            </div>

            <h2 className="text-3xl font-semibold">Talk to the developer</h2>

            <p className="text-muted-foreground text-balance">
              No sales team, no ticket queue — you are writing to the person who
              wrote the contracts. Bonding an agent, auditing, or just curious
              how it works: ask directly.
            </p>

            <div className="mt-auto flex flex-wrap gap-1">
              <Link
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "w-fit",
                )}
                href="https://x.com/iamnotdou"
                target="_blank"
                rel="noopener noreferrer"
              >
                DM on X
              </Link>
              <Link
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "text-primary w-fit",
                )}
                href="mailto:hello@boundprotocol.dev"
              >
                hello@boundprotocol.dev
              </Link>
            </div>
          </FeatureCardContent>
        </FeatureCard>

        <FeatureCard className="@4xl:col-span-2 col-span-full grid-rows-1">
          <FeatureCardContent className="@4xl:pb-12 flex h-full flex-col space-y-6">
            <div className="bg-card ring-foreground/3 flex size-12 rounded-full shadow-xl shadow-black/5 ring-1">
              <GitPullRequestArrow className="text-muted-foreground m-auto size-4" />
            </div>

            <h2 className="text-3xl font-semibold">Open an issue instead</h2>

            <p className="text-muted-foreground text-balance">
              Bound is open source. Found a bug, want a feature, or think the
              trust model is wrong somewhere? An issue is a better conversation
              than an email, because everyone else gets to read it too.
            </p>

            <div className="mt-auto grid grid-cols-[auto_1fr] items-center gap-4">
              <div className="before:border-foreground/25 size-18 bg-muted relative grid place-items-center overflow-hidden rounded-xl before:absolute before:inset-0 before:rounded-xl before:border">
                <LogoIcon className="size-8" />
              </div>

              <div className="space-y-0.5">
                <p className="text-foreground text-balance text-sm font-medium">
                  iamnotdou/bound
                </p>
                <p className="text-foreground/65 text-balance text-xs">
                  MIT licensed · contracts, SDK and MCP server
                </p>

                <div className="mt-3 flex flex-wrap gap-1">
                  <Link
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "w-fit",
                    )}
                    href="https://github.com/iamnotdou/bound/issues/new"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open an issue
                  </Link>
                  <Link
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "w-fit",
                    )}
                    href="https://github.com/iamnotdou/bound"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Browse the source
                  </Link>
                </div>
              </div>
            </div>
          </FeatureCardContent>
        </FeatureCard>
      </Container>

      <Separator className="h-24" />
    </section>
  );
}
