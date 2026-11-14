"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { grid, sideCol } from "@/components/navy/grid";
import { Logo } from "@/components/navy/logo";
import { Text } from "@/components/navy/text";
import { Wrapper } from "@/components/navy/wrapper";
import { NEAR_GITHUB_URL, NEAR_NPM_URL } from "@/lib/near/links";

/**
 * The fixed navigation of the NEAR site. Solid on the page ground; it turns
 * transparent with white links while its middle sits over an element marked
 * `data-nav-dark` (gradient heroes, the bottom of the footer) and
 * transparent with ink links over `data-nav-clear` (the light top of the
 * footer). `<main data-navy-main>` clears its height (`--nav-height`).
 */
type NavLink = {
  href: string;
  label: string;
  /** next/link for app routes; a plain <a> for the static deck. */
  kind: "route" | "static" | "external";
};

const primary: NavLink[] = [
  { href: "/app/near", label: "App", kind: "route" },
  { href: "/docs", label: "Docs", kind: "route" },
  // The deck is a static HTML file, not a Next route: a plain anchor avoids
  // an RSC prefetch that would 404.
  { href: "/deck", label: "Deck", kind: "static" },
];

const secondary: NavLink[] = [
  { href: NEAR_GITHUB_URL, label: "GitHub", kind: "external" },
  { href: NEAR_NPM_URL, label: "npm", kind: "external" },
];

const linkClass =
  "rounded-sm text-sm text-foreground transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30 aria-[current=page]:font-medium nav-dark:text-inverse-foreground nav-dark:hover:text-inverse-foreground/70";

function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavAnchor({
  link,
  className,
  current,
  onClick,
  children,
}: {
  link: NavLink;
  className: string;
  current?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  if (link.kind === "route") {
    return (
      <Link
        href={link.href}
        className={className}
        aria-current={current ? "page" : undefined}
        onClick={onClick}
      >
        {children}
      </Link>
    );
  }
  if (link.kind === "external") {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={onClick}
      >
        {children}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  return (
    <a
      href={link.href}
      className={className}
      aria-current={current ? "page" : undefined}
      onClick={onClick}
    >
      {children}
    </a>
  );
}

export function Navigation() {
  const pathname = usePathname() ?? "/";
  const bar = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  // Dark or clear while the middle of the bar sits over a marked element.
  // Queried on every tick so client navigations pick up the new page.
  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    let ticking = false;
    const under = (selector: string) => {
      const middle = el.offsetHeight / 2;
      return Array.from(document.querySelectorAll<HTMLElement>(selector)).some(
        (node) => {
          const rect = node.getBoundingClientRect();
          return rect.top <= middle && rect.bottom >= middle;
        },
      );
    };
    const update = () => {
      el.dataset.nav = under("[data-nav-dark]")
        ? "dark"
        : under("[data-nav-clear]")
          ? "clear"
          : "light";
      ticking = false;
    };
    const request = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    return () => {
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
    };
  }, [pathname]);

  const setMenu = useCallback((next: boolean) => {
    setOpen(next);
    requestAnimationFrame(() =>
      (next ? close.current : toggle.current)?.focus(),
    );
  }, []);

  // Escape closes the menu; the page behind it does not scroll
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
    };
    document.addEventListener("keydown", onKey);
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      root.style.overflow = previous;
    };
  }, [open, setMenu]);

  return (
    <>
      <div
        ref={bar}
        data-nav="initial"
        className="bg-background nav-clear:bg-transparent nav-dark:bg-transparent fixed inset-x-0 top-0 z-50 w-full transition-colors duration-300 motion-reduce:transition-none"
      >
        <Wrapper>
          <div
            className={clsx(
              "relative flex h-14 items-center justify-between md:gap-12 lg:grid lg:gap-y-0",
              grid,
            )}
          >
            <Link
              href="/"
              className={clsx(
                "focus-visible:ring-primary/30 flex items-center gap-2 rounded-sm focus-visible:ring-3 focus-visible:outline-none md:flex-1",
                sideCol,
              )}
            >
              <span className="sr-only">Bound on NEAR, home</span>
              <Logo
                className="text-foreground nav-dark:text-inverse-foreground transition-colors"
                aria-hidden
              />
              <span
                aria-hidden="true"
                className="text-muted-foreground nav-dark:text-inverse-foreground/70 hidden text-sm sm:inline"
              >
                on NEAR
              </span>
            </Link>
            <button
              ref={toggle}
              type="button"
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls="navy-mobile-menu"
              onClick={() => setMenu(true)}
              className="text-foreground nav-dark:text-inverse-foreground focus-visible:ring-primary/30 -mr-2 flex size-9 items-center justify-center rounded-md focus-visible:ring-3 focus-visible:outline-none md:hidden"
            >
              <svg
                className="size-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeWidth="1.5"
                  d="M4 9h16M4 15h16"
                />
              </svg>
            </button>
            <nav aria-label="Main" className="hidden md:contents">
              <ul
                role="list"
                className="flex flex-row items-center justify-center gap-6 lg:col-span-6 lg:justify-start"
              >
                {primary.map((link) => (
                  <li key={link.href}>
                    <NavAnchor
                      link={link}
                      className={linkClass}
                      current={isCurrent(pathname, link.href)}
                    >
                      {link.label}
                    </NavAnchor>
                  </li>
                ))}
              </ul>
              <ul
                role="list"
                className="flex flex-1 items-center justify-end gap-6 lg:col-span-3"
              >
                {secondary.map((link) => (
                  <li key={link.href}>
                    <NavAnchor link={link} className={linkClass}>
                      {link.label}
                    </NavAnchor>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </Wrapper>
      </div>

      <div
        id="navy-mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        inert={!open}
        data-open={open ? "" : undefined}
        className="group bg-background data-open:pointer-events-auto data-open:opacity-100 pointer-events-none fixed inset-0 z-50 flex h-svh flex-col overflow-y-auto overscroll-contain opacity-0 transition-opacity duration-300 ease-out motion-reduce:transition-none md:hidden"
      >
        <Wrapper className="w-full">
          <div className="flex h-14 items-center justify-between">
            <Link
              href="/"
              onClick={() => setMenu(false)}
              className="focus-visible:ring-primary/30 rounded-sm focus-visible:ring-3 focus-visible:outline-none"
            >
              <span className="sr-only">Bound on NEAR, home</span>
              <Logo className="text-foreground" aria-hidden />
            </Link>
            <button
              ref={close}
              type="button"
              aria-label="Close menu"
              onClick={() => setMenu(false)}
              className="text-foreground focus-visible:ring-primary/30 -mr-2 flex size-9 items-center justify-center rounded-md focus-visible:ring-3 focus-visible:outline-none"
            >
              <svg
                className="size-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeWidth="1.5"
                  d="M6 6l12 12M18 6L6 18"
                />
              </svg>
            </button>
          </div>
        </Wrapper>
        <Wrapper className="flex w-full flex-1 flex-col pt-10 pb-8">
          <Text
            tag="p"
            variant="textXS"
            className="text-faint-foreground uppercase"
          >
            <span aria-hidden="true">{"///"}</span> Menu
          </Text>
          <nav aria-label="Mobile">
            <ul role="list" className="border-border mt-4 border-t">
              {primary.map((link, index) => (
                <li
                  key={link.href}
                  className="border-border translate-y-2 border-b opacity-0 transition duration-500 ease-out group-data-open:translate-y-0 group-data-open:opacity-100 motion-reduce:translate-y-0 motion-reduce:transition-none"
                  style={{ transitionDelay: `${80 + index * 40}ms` }}
                >
                  <NavAnchor
                    link={link}
                    current={isCurrent(pathname, link.href)}
                    onClick={() => setMenu(false)}
                    className="group/link focus-visible:ring-primary/30 flex items-center justify-between py-4 focus-visible:ring-3 focus-visible:outline-none"
                  >
                    <Text
                      tag="span"
                      variant="displaySM"
                      className="text-foreground tracking-tight"
                    >
                      {link.label}
                    </Text>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="text-faint-foreground size-4 transition-transform group-hover/link:translate-x-0.5"
                    >
                      <path d="M5 12l14 0M13 18l6 -6M13 6l6 6" />
                    </svg>
                  </NavAnchor>
                </li>
              ))}
            </ul>
            <ul role="list" className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
              {secondary.map((link) => (
                <li key={link.href}>
                  <NavAnchor
                    link={link}
                    onClick={() => setMenu(false)}
                    className="text-muted-foreground hover:text-foreground focus-visible:ring-primary/30 rounded-sm text-sm transition-colors focus-visible:ring-3 focus-visible:outline-none"
                  >
                    {link.label}
                  </NavAnchor>
                </li>
              ))}
            </ul>
          </nav>
        </Wrapper>
      </div>
    </>
  );
}
