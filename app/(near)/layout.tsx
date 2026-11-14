import { notFound } from "next/navigation";
import { Footer } from "@/components/navy/footer";
import { Navigation } from "@/components/navy/navigation";
import { NEAR_ONLY } from "@/lib/site";

/**
 * The NEAR-only site's own pages: the landing page (`/near-home`, which
 * `proxy.ts` serves at `/`) and the docs under `/docs`. On the main site
 * this group does not exist: `/docs` is redirected by `next.config.ts`
 * before it gets here, and everything else 404s.
 */
export default function NearSiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!NEAR_ONLY) notFound();
  return (
    <>
      <Navigation />
      <main data-navy-main className="bg-background relative flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
