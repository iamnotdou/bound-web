import { NEAR_OG_HEADLINE, OG_SIZE, renderOgImage } from "@/lib/og-image";
import { NEAR_ONLY } from "@/lib/site";

export const alt = NEAR_ONLY
  ? "Bound on NEAR: bonded and insured AI agents"
  : "Bound — A surety bond for AI agents, on-chain";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpengraphImage() {
  if (NEAR_ONLY) {
    return renderOgImage(
      "The bond-and-insurance layer for AI agents on NEAR: a locked reserve and an auditor's slashable stake, live on NEAR testnet.",
      "Built at NEAR HACKATHON",
      "default",
      NEAR_OG_HEADLINE,
    );
  }
  return renderOgImage(
    "A surety bond for AI agents — pre-funded, auditor-staked, and verifiable on Stellar.",
    "github.com/iamnotdou/bound",
  );
}
