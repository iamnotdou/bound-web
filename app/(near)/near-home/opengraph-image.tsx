import { NEAR_OG_HEADLINE, OG_SIZE, renderOgImage } from "@/lib/og-image";

export const alt = "Bound on NEAR: bonded and insured AI agents";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function NearHomeOpengraphImage() {
  return renderOgImage(
    "The bond-and-insurance layer for AI agents on NEAR: a locked reserve and an auditor's slashable stake, live on NEAR testnet.",
    "Built at NEAR HACKATHON",
    "navy",
    NEAR_OG_HEADLINE,
  );
}
