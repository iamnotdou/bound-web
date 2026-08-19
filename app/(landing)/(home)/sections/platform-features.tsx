import { InvoiceIllustration } from "@/components/illustrations/invoice-illustration";
import { FlowIllustration } from "@/components/illustrations/flow-illustration";
import { Container, Separator } from "@/components/container";
import { FeatureCard, FeatureCardContent } from "@/components/ui/feature-card";
import { CreditCardIllustration } from "@/components/illustrations/credit-card-illustration";

import Link from "next/link";
import { Check, CreditCard, ScanFace, Scroll } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PlatformFeatures() {
  return (
    <section id="features">
      <Container asGrid className="@4xl:grid-cols-4 grid-cols-2">
        <FeatureCard className="@4xl:col-span-2 col-span-full grid-rows-1">
          <FeatureCardContent className="@4xl:pb-12 flex h-full flex-col space-y-6">
            <div className="bg-card ring-foreground/3 flex size-12 rounded-full shadow-xl shadow-black/5 ring-1">
              <Scroll className="text-muted-foreground m-auto size-4" />
            </div>

            <h2 className="text-3xl font-semibold">Bonds, Not Promises</h2>

            <p className="text-muted-foreground text-balance">
              Every bonded agent carries a{" "}
              <strong className="text-foreground font-semibold">
                pre-funded coverage amount
              </strong>{" "}
              — a hard number for the worst case, locked before the first
              transaction.
            </p>

            <ul className="w-full space-y-2">
              {[
                "Pre-funded, on-chain coverage",
                "Transparent bond terms",
                "Instant lookup by agent ID",
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

        <div className="@4xl:col-span-2 col-span-full">
          <div className="mx-auto self-center">
            <InvoiceIllustration />
          </div>
        </div>
      </Container>

      <Separator className="h-24" />

      <Container asGrid className="@4xl:grid-cols-4 grid-cols-2">
        <div className="@4xl:col-span-2 col-span-full">
          <div className="mx-auto self-center">
            <FlowIllustration />
          </div>
        </div>

        <FeatureCard className="@max-4xl:row-start-1 @4xl:col-span-2 col-span-full grid-rows-1">
          <FeatureCardContent className="@4xl:pb-12 flex h-full flex-col space-y-6">
            <div className="bg-card ring-foreground/3 flex size-12 rounded-full shadow-xl shadow-black/5 ring-1">
              <ScanFace className="text-muted-foreground m-auto size-4" />
            </div>

            <h2 className="text-3xl font-semibold">
              Auditor-Staked Verification
            </h2>

            <p className="text-muted-foreground text-balance">
              Independent auditors review each agent and{" "}
              <strong className="text-foreground font-semibold">
                stake their own funds
              </strong>{" "}
              behind the attestation — skin in the game, not a badge.
            </p>

            <ul className="w-full space-y-2">
              {[
                "Auditors stake on every review",
                "Bad attestations get slashed",
                "Attestations verifiable on Stellar",
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
      </Container>

      <Separator className="h-24" />

      <Container asGrid className="@4xl:grid-cols-4 grid-cols-2">
        <FeatureCard className="@4xl:col-span-2 col-span-full grid-rows-1">
          <FeatureCardContent className="@4xl:pb-12 flex h-full flex-col space-y-6">
            <div className="bg-card ring-foreground/3 flex size-12 rounded-full shadow-xl shadow-black/5 ring-1">
              <CreditCard className="text-muted-foreground m-auto size-4" />
            </div>

            <h2 className="text-3xl font-semibold">Claims That Actually Pay</h2>

            <p className="text-muted-foreground text-balance">
              When an agent causes a loss, the claim{" "}
              <strong className="text-foreground font-semibold">
                pays out from the bond
              </strong>{" "}
              — on-chain, without negotiating with a counterparty.
            </p>

            <ul className="w-full space-y-2">
              {[
                "Payouts settle on Stellar",
                "No counterparty negotiation",
                "Worst case is the ceiling, always",
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

        <div className="@4xl:col-span-2 col-span-full">
          <CreditCardIllustration />
        </div>
      </Container>

      <Separator className="h-24" />
    </section>
  );
}
