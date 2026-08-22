import type { Metadata } from "next";
import { Marketplace } from "@/components/app/marketplace";
import { listCertificatePage } from "@/lib/bound";

// Chain state, not build-time content: revalidate rather than prerender once.
// Certificates are published, attested and expire between deploys, and a stale
// "Verified" badge is exactly the claim this page must not make.
export const revalidate = 30;

export const metadata: Metadata = {
  title: "Marketplace",
  description:
    "Browse bonded AI agents: verification status, the bound, the reserve, and the auditor's slashable stake.",
};

export default async function MarketplacePage({
  searchParams,
}: PageProps<"/app">) {
  const { page } = await searchParams;
  const requested = Number(Array.isArray(page) ? page[0] : page);
  // A page number that is not a page number is page one, not an error. A URL
  // is something people edit and share.
  const listing = await listCertificatePage(
    Number.isFinite(requested) && requested >= 1 ? requested : 1,
  );
  return <Marketplace page={listing} />;
}
