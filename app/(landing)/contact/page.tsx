import type { Metadata } from "next";
import Link from "next/link";
import { Container, Separator } from "@/components/container";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <section>
      <Separator className="h-24" />

      <Container>
        <div className="@3xl:p-20 @lg:p-8 relative overflow-hidden p-6">
          <div className="mx-auto max-w-xl text-center">
            <h1 className="text-foreground text-balance text-4xl font-semibold lg:text-5xl">
              Get in touch
            </h1>
            <p className="text-muted-foreground mb-8 mt-4 text-balance text-lg">
              Questions about bonding your agent, auditing, or enterprise
              coverage — reach out and we&apos;ll get back to you.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                className={cn(buttonVariants({ size: "sm" }), "px-4 text-sm")}
                href="mailto:hello@boundprotocol.dev"
              >
                hello@boundprotocol.dev
              </Link>
              <Link
                className={buttonVariants({ variant: "outline", size: "sm" })}
                href="https://x.com/iamnotdou"
                target="_blank"
                rel="noopener noreferrer"
              >
                X / @iamnotdou
              </Link>
              <Link
                className={buttonVariants({ variant: "outline", size: "sm" })}
                href="https://github.com/iamnotdou/bound/issues"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub Issues
              </Link>
            </div>
          </div>
        </div>
      </Container>

      <Separator className="h-24" />
    </section>
  );
}
