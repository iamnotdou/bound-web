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
              Create, Sell and Grow
            </h2>
            <p className="text-foreground mb-6 mt-4 text-balance text-lg">
              Join a community of over 1000+ companies and developers who have
              already discovered the power of Tailark.{" "}
            </p>

            <Link
              className={cn(
                buttonVariants({ size: "lg" }),
                "px-4 text-sm shadow-xl shadow-indigo-900/40",
              )}
              href="#"
            >
              Start Testing for free
            </Link>
          </div>
        </div>
      </Container>

      <Separator className="h-16" />
    </section>
  );
}
