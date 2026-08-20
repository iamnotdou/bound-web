import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { LogoIcon } from "@/components/logo";
import { GitPullRequestArrow, MessageCircle } from "lucide-react";

export default function Contact() {
  return (
    <section className="bg-background py-24">
      <div className="@container mx-auto max-w-5xl px-2">
        <div className="mx-auto max-w-4xl">
          <div className="px-4 text-center">
            <h1 className="text-balance text-4xl font-semibold md:text-5xl lg:tracking-tight">
              Get in touch
            </h1>
            <p className="text-muted-foreground mt-4 text-balance text-lg">
              Bound is built and maintained by one person. Questions, bug
              reports and ideas all reach the same inbox.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-2xl gap-1 rounded-2xl border p-1">
            <Card className="flex flex-col rounded-xl p-6">
              <div className="relative mb-4">
                <MessageCircle className="drop-shadow-indigo-500/20 *:not-first:opacity-25 not-dark:*:first:stroke-card size-5 drop-shadow" />
                <MessageCircle className="mask-t-from-25% mask-t-to-75% drop-shadow-emerald-500/20 not-dark:*:first:stroke-card *:not-first:opacity-50 absolute inset-0 size-5 drop-shadow" />
              </div>
              <h2 className="text-lg font-medium">Talk to the developer</h2>
              <p className="text-muted-foreground mb-4 mt-2 text-balance">
                No sales team, no ticket queue — you are writing to the person
                who wrote the contracts. Bonding an agent, auditing, or just
                curious how it works: ask directly.
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
            </Card>

            <div className="col-span-full flex flex-col p-6">
              <div className="space-y-6">
                <div className="relative w-fit">
                  <GitPullRequestArrow className="drop-shadow-indigo-500/20 *:not-first:opacity-25 not-dark:*:first:stroke-card size-5 drop-shadow" />
                  <GitPullRequestArrow className="mask-t-from-25% mask-t-to-75% drop-shadow-emerald-500/20 not-dark:*:first:stroke-card *:not-first:opacity-50 absolute inset-0 size-5 drop-shadow" />
                </div>

                <p className="text-foreground text-balance text-xl">
                  Bound is open source. Found a bug, want a feature, or think
                  the trust model is wrong somewhere? Open an issue — that is a
                  better conversation than an email, because everyone else gets
                  to read it too.
                </p>

                <div className="grid grid-cols-[auto_1fr] items-center gap-4">
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
