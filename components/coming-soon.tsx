import Link from "next/link";
import { Container, Separator } from "@/components/container";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section>
      <Separator className="h-24" />

      <Container>
        <div className="@3xl:p-20 @lg:p-8 relative overflow-hidden p-6">
          <div className="mx-auto max-w-xl text-center">
            <span className="text-muted-foreground font-mono text-sm uppercase">
              Coming soon
            </span>
            <h1 className="text-foreground mt-3 text-balance text-4xl font-semibold lg:text-5xl">
              {title}
            </h1>
            <p className="text-muted-foreground mb-6 mt-4 text-balance text-lg">
              {description}
            </p>

            <Link
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "px-4 text-sm",
              )}
              href="https://github.com/iamnotdou/bound"
              target="_blank"
              rel="noopener noreferrer"
            >
              Follow along on GitHub
            </Link>
          </div>
        </div>
      </Container>

      <Separator className="h-24" />
    </section>
  );
}
