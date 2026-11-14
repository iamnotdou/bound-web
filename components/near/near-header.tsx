import Link from "next/link";
import { Logo } from "@/components/logo";
import { NEAR_GITHUB_URL, NEAR_NPM_URL } from "@/lib/near/links";
import { cn } from "@/lib/utils";

/**
 * The header of the NEAR-only site (near.boundprotocol.dev): landing, docs,
 * deck and the `/app/near` pages. Same bar as the app header, with links
 * that stay inside the NEAR deploy. Server-rendered, no menu state: five
 * short links fit a phone, the two external ones collapse to icons.
 */
const internal = [
  { href: "/app/near", label: "App" },
  { href: "/docs", label: "Docs" },
  { href: "/deck", label: "Deck" },
];

const linkClass =
  "text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 rounded text-sm transition-colors focus-visible:outline-none focus-visible:ring-2";

export function NearHeader() {
  return (
    <header className="bg-background/80 border-border sticky top-0 z-40 w-full border-b backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" aria-label="Bound on NEAR, home" className="shrink-0">
          <Logo />
        </Link>

        <nav
          aria-label="Bound on NEAR"
          className="flex min-w-0 items-center gap-3 sm:gap-5"
        >
          {internal.map((l) => (
            <Link key={l.href} href={l.href} className={linkClass}>
              {l.label}
            </Link>
          ))}
          <a
            href={NEAR_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            <GitHubMark className="size-4" />
            <span className="sr-only sm:not-sr-only">GitHub</span>
          </a>
          <a
            href={NEAR_NPM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(linkClass, "font-address")}
            aria-label="@bound/near on npm"
          >
            npm
          </a>
        </nav>
      </div>
    </header>
  );
}

export function GitHubMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2"
      />
    </svg>
  );
}
