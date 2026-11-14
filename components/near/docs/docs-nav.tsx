"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Text } from "@/components/navy/text";
import { DOC_GROUPS, DOC_PAGES, docHref } from "@/lib/near/docs";

function NavList({ pathname }: { pathname: string }) {
  return (
    <div className="flex flex-col gap-8">
      {DOC_GROUPS.map((group) => (
        <div key={group}>
          <Text
            tag="p"
            variant="textXS"
            className="text-muted-foreground uppercase"
          >
            {group}
          </Text>
          <ul className="mt-3 flex flex-col gap-2">
            {DOC_PAGES.filter((p) => p.group === group).map((p) => {
              const href = docHref(p.slug);
              const active = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "focus-visible:ring-primary/30 block rounded-sm text-sm transition-colors focus-visible:outline-none focus-visible:ring-3",
                      active
                        ? "text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground",
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
 * Docs navigation in the side column: sticky from `lg` up, a collapsible
 * hairline row above the article below that. Both read `DOC_PAGES`.
 */
export function DocsNav() {
  const pathname = usePathname();
  const current =
    DOC_PAGES.find((p) => docHref(p.slug) === pathname)?.title ?? "Docs";
  return (
    <>
      <details
        key={pathname}
        className="border-border group border-y lg:hidden"
      >
        <summary className="focus-visible:ring-primary/30 text-foreground hover:text-muted-foreground flex cursor-pointer select-none list-none items-center justify-between gap-6 py-4 focus-visible:outline-none focus-visible:ring-3 [&::-webkit-details-marker]:hidden">
          <span>
            <Text
              tag="span"
              variant="textXS"
              className="text-muted-foreground block uppercase"
            >
              Docs
            </Text>
            <Text
              tag="span"
              variant="textSM"
              className="mt-1 block font-medium"
            >
              {current}
            </Text>
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            aria-hidden="true"
            className="text-faint-foreground size-4 shrink-0 transition-transform duration-300 group-open:rotate-45 motion-reduce:transition-none"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </summary>
        <nav aria-label="Docs" className="pb-8 pt-4">
          <NavList pathname={pathname} />
        </nav>
      </details>
      <nav aria-label="Docs" className="hidden lg:sticky lg:top-28 lg:block">
        <NavList pathname={pathname} />
      </nav>
    </>
  );
}
