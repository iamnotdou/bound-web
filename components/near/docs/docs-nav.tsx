"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { DOC_GROUPS, DOC_PAGES, docHref } from "@/lib/near/docs";
import { cn } from "@/lib/utils";

function NavList({ pathname }: { pathname: string }) {
  return (
    <div className="space-y-5">
      {DOC_GROUPS.map((group) => (
        <div key={group}>
          <p className="text-foreground/50 mb-1.5 px-2 text-xs font-medium uppercase tracking-wide">
            {group}
          </p>
          <ul className="space-y-0.5">
            {DOC_PAGES.filter((p) => p.group === group).map((p) => {
              const href = docHref(p.slug);
              const active = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "focus-visible:ring-ring block rounded-md px-2 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2",
                      active
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                    )}
                  >
                    {p.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/**
 * Docs navigation: a sticky sidebar from `lg` up, a collapsible menu above
 * the content below that. Both read `DOC_PAGES`.
 */
export function DocsNav() {
  const pathname = usePathname();
  const current =
    DOC_PAGES.find((p) => docHref(p.slug) === pathname)?.title ?? "Docs";
  return (
    <>
      <details
        key={pathname}
        className="bg-card ring-foreground/10 group rounded-lg ring-1 lg:hidden"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm [&::-webkit-details-marker]:hidden">
          <span>
            <span className="text-muted-foreground">Docs / </span>
            <span className="text-foreground font-medium">{current}</span>
          </span>
          <ChevronDown
            aria-hidden
            className="text-muted-foreground size-4 transition-transform group-open:rotate-180"
          />
        </summary>
        <nav aria-label="Docs" className="border-border border-t p-2">
          <NavList pathname={pathname} />
        </nav>
      </details>
      <nav
        aria-label="Docs"
        className="sticky top-20 hidden max-h-[calc(100vh-6rem)] overflow-y-auto pb-8 lg:block"
      >
        <NavList pathname={pathname} />
      </nav>
    </>
  );
}
