import { DocsNav } from "@/components/near/docs/docs-nav";

/**
 * Every NEAR docs page: the sidebar (a collapsible menu on phones) and the
 * article column. The NEAR header and footer come from the `(near)` group
 * layout, which also 404s this whole tree on the main site.
 */
export default function NearDocsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12 lg:py-12">
      <aside className="mb-6 lg:mb-0">
        <DocsNav />
      </aside>
      <div className="min-w-0 max-w-3xl">{children}</div>
    </div>
  );
}
