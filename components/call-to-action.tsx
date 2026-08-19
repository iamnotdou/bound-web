import Link from "next/link";
import { Container, Separator } from "@/components/container";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CallToAction() {
  return (
    <section>
      <Separator className="h-16" />

      <Container>
        <div className="@3xl:p-20 @lg:p-8 relative overflow-hidden p-6">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-foreground text-balance text-4xl font-semibold lg:text-5xl">
              Give your agent a number
            </h2>
            <p className="text-foreground mb-6 mt-4 text-balance text-lg">
              Ship agents people can trust — with a pre-funded worst case anyone
              can verify on Stellar. Open source, built in public.
            </p>

            <Link
              className={cn(buttonVariants({ size: "lg" }), "px-4 text-sm")}
              href="/app"
            >
              Bond your agent
            </Link>
          </div>
        </div>
      </Container>

      <Separator className="h-16" />
    </section>
  );
}
