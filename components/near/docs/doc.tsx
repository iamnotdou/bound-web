import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { docHref, docNeighbours, getDocPage } from "@/lib/near/docs";
import { cn } from "@/lib/utils";

/**
 * The building blocks every NEAR docs page is written in. Plain server
 * components over the site's own tokens: no markdown pipeline, no extra
 * dependency, and every page is static HTML at build time.
 */

export function DocArticle({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const page = getDocPage(slug);
  const { prev, next } = docNeighbours(slug);
  return (
    <article className="min-w-0">
      <header className="border-border border-b pb-6">
        <p className="text-primary text-xs font-medium uppercase tracking-wide">
          {page.group}
        </p>
        <h1 className="text-foreground mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          {page.title}
        </h1>
        <p className="text-muted-foreground mt-3 text-balance text-lg">
          {page.description}
        </p>
      </header>
      <div className="text-foreground/85 space-y-4 pt-2 text-[0.95rem] leading-relaxed">
        {children}
      </div>
      <nav
        aria-label="Previous and next page"
        className="border-border mt-14 grid gap-3 border-t pt-6 sm:grid-cols-2"
      >
        {prev ? (
          <Link
            href={docHref(prev.slug)}
            className="bg-card ring-foreground/10 hover:ring-foreground/25 group rounded-lg p-4 ring-1 transition"
          >
            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
              <ArrowLeft aria-hidden className="size-3.5" /> Previous
            </span>
            <span className="text-foreground mt-1 block font-medium">
              {prev.title}
            </span>
          </Link>
        ) : (
          <span className="hidden sm:block" />
        )}
        {next ? (
          <Link
            href={docHref(next.slug)}
            className="bg-card ring-foreground/10 hover:ring-foreground/25 group rounded-lg p-4 text-right ring-1 transition"
          >
            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
              Next <ArrowRight aria-hidden className="size-3.5" />
            </span>
            <span className="text-foreground mt-1 block font-medium">
              {next.title}
            </span>
          </Link>
        ) : null}
      </nav>
    </article>
  );
}

export function H2({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <h2
      id={id}
      className="text-foreground group scroll-mt-20 pt-8 text-2xl font-semibold tracking-tight"
    >
      <a
        href={`#${id}`}
        className="hover:underline decoration-foreground/20 underline-offset-4"
      >
        {children}
      </a>
    </h2>
  );
}

export function H3({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <h3
      id={id}
      className="text-foreground scroll-mt-20 pt-4 text-lg font-semibold tracking-tight"
    >
      {children}
    </h3>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}

/** Inline code: method names, account ids, error codes. */
export function C({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-address bg-muted text-foreground rounded px-1 py-0.5 text-[0.85em] [overflow-wrap:anywhere]">
      {children}
    </code>
  );
}

export function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul className="marker:text-foreground/30 list-disc space-y-1.5 pl-5">
      {children}
    </ul>
  );
}

export function OL({ children }: { children: React.ReactNode }) {
  return (
    <ol className="marker:text-foreground/50 list-decimal space-y-1.5 pl-5">
      {children}
    </ol>
  );
}

export function A({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const external = /^https?:\/\//.test(href);
  const cls =
    "text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary";
  if (external)
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    );
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

/** A table that scrolls inside its own box on a phone. */
export function Table({
  head,
  rows,
  className,
}: {
  head: React.ReactNode[];
  rows: React.ReactNode[][];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "ring-foreground/10 bg-card overflow-x-auto rounded-lg ring-1",
        className,
      )}
    >
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-border border-b">
            {head.map((h, i) => (
              <th
                key={i}
                scope="col"
                className="text-foreground whitespace-nowrap px-3 py-2 font-medium"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-border border-b last:border-0">
              {r.map((cell, j) => (
                <td key={j} className="text-foreground/80 px-3 py-2 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A callout for caveats a reader must not miss. */
export function Note({
  title,
  children,
  tone = "default",
}: {
  title?: string;
  children: React.ReactNode;
  tone?: "default" | "warn";
}) {
  return (
    <div
      className={cn(
        "rounded-lg p-4 text-sm ring-1",
        tone === "warn"
          ? "bg-primary/5 ring-primary/25"
          : "bg-card ring-foreground/10",
      )}
    >
      {title ? (
        <p className="text-foreground mb-1 font-medium">{title}</p>
      ) : null}
      <div className="text-foreground/80 space-y-2">{children}</div>
    </div>
  );
}

/** Cards linking to other docs pages. */
export function CardLinks({
  items,
}: {
  items: { href: string; title: string; body: React.ReactNode }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          className="bg-card ring-foreground/10 hover:ring-foreground/25 rounded-lg p-4 ring-1 transition"
        >
          <span className="text-foreground inline-flex items-center gap-1 font-medium">
            {it.title} <ArrowRight aria-hidden className="size-3.5" />
          </span>
          <span className="text-muted-foreground mt-1 block text-sm">
            {it.body}
          </span>
        </Link>
      ))}
    </div>
  );
}
