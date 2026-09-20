import type { Metadata } from "next";
import { Marketplace } from "@/components/app/marketplace";
import { listCertificatePage } from "@/lib/bound";
import { nowUnix } from "@/lib/clock";

// Chain state, not build-time content: revalidate rather than prerender once.
// Certificates are published, attested and expire between deploys, and a stale
// "Verified" badge is exactly the claim this page must not make.
export const revalidate = 30;

export const metadata: Metadata = {
  title: "Marketplace",
  description:
    "Browse AI agents with a bond posted on-chain: what each one covers, what its operator claims to have set aside, and which auditor put their own money behind it.",
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
  // The clock comes from here rather than from the client component's body:
  // an expiry read during render is an impure call, and one read on the server
  // also keeps "expires in 3 months" identical either side of hydration.
  return <Marketplace page={listing} now={nowUnix()} />;
}
