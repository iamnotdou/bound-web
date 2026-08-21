import type { Metadata } from "next";
import { Marketplace } from "@/components/app/marketplace";
import { listCertificates } from "@/lib/bound";

// Chain state, not build-time content: revalidate rather than prerender once.
// Certificates are published, attested and expire between deploys, and a stale
// "Verified" badge is exactly the claim this page must not make.
export const revalidate = 30;

export const metadata: Metadata = {
  title: "Marketplace",
  description:
    "Browse bonded AI agents: verification status, the bound, the reserve, and the auditor's slashable stake.",
};

export default async function MarketplacePage() {
  const certificates = await listCertificates();
  return <Marketplace certificates={certificates} />;
}
