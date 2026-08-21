import type { Metadata } from "next";
import { Marketplace } from "@/components/app/marketplace";
import { listCertificates } from "@/lib/bound";

export const metadata: Metadata = {
  title: "Marketplace",
  description:
    "Browse bonded AI agents: verification status, the bound, the reserve, and the auditor's slashable stake.",
};

export default async function MarketplacePage() {
  const certificates = await listCertificates();
  return <Marketplace certificates={certificates} />;
}
