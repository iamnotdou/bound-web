import { clsx } from "clsx";
import { grid, mainCol, sideCol } from "@/components/navy/grid";
import { Wrapper } from "@/components/navy/wrapper";
import { DocsNav } from "@/components/near/docs/docs-nav";

/**
 * Every NEAR docs page, on Navy's help-center article layout: the docs
 * navigation in the side column (a collapsible row on phones) and the
 * article in the main column. The navigation and footer come from the
 * `(near)` group layout, which also 404s this whole tree on the main site.
 */
export default function NearDocsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <section>
      <Wrapper className="pb-32 pt-16 lg:pt-28">
        <div className={clsx("grid gap-12", grid)}>
          <aside className={clsx("min-w-0", sideCol)}>
            <DocsNav />
          </aside>
          <div className={clsx("min-w-0", mainCol)}>{children}</div>
        </div>
      </Wrapper>
    </section>
  );
}
