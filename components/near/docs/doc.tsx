import Link from "next/link";
import { clsx } from "clsx";
import { ArrowLink, Chevron } from "@/components/navy/arrow-link";
import { Text } from "@/components/navy/text";
import { Wrapper } from "@/components/navy/wrapper";
import {
  docHref,
  docNeighbours,
  getDocPage,
  type DocPage,
} from "@/lib/near/docs";

/**
 * The building blocks every NEAR docs page is written in, in Navy's
 * help-center article style: a light header (breadcrumb, display title,
 * intro), a prose body under a hairline, hairline tables and lists, muted
 * code panels and the previous/next links. Plain server components: no
 * markdown pipeline, every page is static HTML at build time.
 */

const focusRing =
  "rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30";

/** The page title with its `emphasis` words in <em>. */
function Title({ page }: { page: DocPage }) {
  const { title, emphasis } = page;
  const at = emphasis ? title.lastIndexOf(emphasis) : -1;
  if (!emphasis || at < 0) return <>{title}</>;
  return (
    <>
      {title.slice(0, at)}
      <em>{emphasis}</em>
      {title.slice(at + emphasis.length)}
    </>
  );
}

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
    <article className="min-w-0 max-w-3xl">
      <nav aria-label="Breadcrumb">
        <ol className="text-muted-foreground flex flex-wrap items-center gap-1 text-xs uppercase">
          <li>
            <Link
              href="/docs"
              className={clsx(
                "hover:text-foreground transition-colors",
                focusRing,
              )}
            >
              Docs
            </Link>
          </li>
          <li aria-hidden="true">
            <Chevron className="text-faint-foreground size-3.5" />
          </li>
          <li>{page.group}</li>
        </ol>
      </nav>
      <Text
        tag="h1"
        variant="displayLG"
        className="text-foreground mt-6 text-balance tracking-tight"
      >
        <Title page={page} />
      </Text>
      <Text
        tag="p"
        variant="textLG"
        className="text-muted-foreground mt-6 text-pretty"
      >
        {page.description}
      </Text>
      <div className="border-border mt-10 border-t pt-10">
        <Wrapper variant="prose">{children}</Wrapper>
      </div>
      <nav
        aria-label="Previous and next page"
        className="border-border mt-16 grid gap-8 border-t pt-8 sm:grid-cols-2"
      >
        {prev ? (
          <div>
            <Text
              tag="span"
              variant="textXS"
              className="text-muted-foreground block uppercase"
            >
              Previous
            </Text>
            <ArrowLink asChild size="base" className="mt-3">
              <Link href={docHref(prev.slug)}>{prev.title}</Link>
            </ArrowLink>
          </div>
        ) : null}
        {next ? (
          <div className="sm:col-start-2">
            <Text
              tag="span"
              variant="textXS"
              className="text-muted-foreground block uppercase"
            >
              Next
            </Text>
            <ArrowLink asChild size="base" className="mt-3">
              <Link href={docHref(next.slug)}>{next.title}</Link>
            </ArrowLink>
          </div>
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
    <h2 id={id} className="scroll-mt-28 tracking-tight">
      <a
        href={`#${id}`}
        className={clsx(
          "text-foreground hover:text-muted-foreground border-0",
          focusRing,
        )}
      >
        {children}
      </a>
    </h2>
  );
}

export function H3({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h3 id={id} className={clsx("scroll-mt-28 tracking-tight", className)}>
      {children}
    </h3>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="text-pretty">{children}</p>;
}

/**
 * Inline code: method names, account ids, error codes. Switzer like the
 * rest of the page (account ids and numbers are never monospace); only
 * code blocks use the code face.
 */
export function C({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-muted text-foreground wrap-anywhere px-1 py-0.5 font-sans">
      {children}
    </code>
  );
}

/** A hairline list: one row per item, no bullets. */
export function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul className="border-border list-none border-t pl-0 *:my-0 *:border-b *:border-border *:py-4 *:pl-0">
      {children}
    </ul>
  );
}

/** A numbered hairline list. */
export function OL({ children }: { children: React.ReactNode }) {
  return (
    <ol className="border-border marker:text-faint-foreground list-inside list-decimal border-t pl-0 *:my-0 *:border-b *:border-border *:py-4 *:pl-0">
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
  const cls = clsx("wrap-anywhere", focusRing);
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

/** A hairline table that scrolls inside its own box on a phone. */
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
      className={clsx("border-border mt-8 overflow-x-auto border-t", className)}
    >
      <table className="my-0 w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-border border-b">
            {head.map((h, i) => (
              <th
                key={i}
                scope="col"
                className="text-muted-foreground whitespace-nowrap py-3 pr-6 text-xs font-normal uppercase last:pr-0"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-border border-b">
              {r.map((cell, j) => (
                <td
                  key={j}
                  className={clsx(
                    "py-4 pr-6 align-top last:pr-0",
                    j === 0 ? "text-foreground" : "text-muted-foreground",
                  )}
                >
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

/** A panel for caveats a reader must not miss: muted, or lilac for warnings. */
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
      className={clsx(
        "text-foreground my-8 p-6",
        tone === "warn" ? "bg-lilac" : "bg-muted",
      )}
    >
      {title ? (
        <Text tag="p" variant="textXS" className="my-0 font-medium uppercase">
          {title}
        </Text>
      ) : null}
      <div
        className={clsx(
          "text-muted-foreground flex flex-col gap-2 text-sm *:my-0",
          title && "mt-3",
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Links to other docs pages, as Navy's help-center article rows. */
export function CardLinks({
  items,
}: {
  items: { href: string; title: string; body: React.ReactNode }[];
}) {
  return (
    <ul className="border-border grid list-none gap-x-8 border-t pl-0 sm:grid-cols-2">
      {items.map((it) => (
        <li key={it.href} className="my-0 pl-0">
          <Link
            href={it.href}
            className={clsx(
              "border-border group flex h-full items-start justify-between gap-4 border-b py-5",
              "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30",
            )}
          >
            <span>
              <Text
                tag="span"
                variant="textSM"
                className="text-foreground group-hover:text-muted-foreground block font-medium transition-colors"
              >
                {it.title}
              </Text>
              <Text
                tag="span"
                variant="textSM"
                className="text-muted-foreground mt-1 block"
              >
                {it.body}
              </Text>
            </span>
            <Chevron className="text-faint-foreground group-hover:text-foreground mt-0.5 size-4 shrink-0 transition group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
