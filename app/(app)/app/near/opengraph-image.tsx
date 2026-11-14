import { OG_SIZE, renderOgImage } from "@/lib/og-image";
import { NEAR_ONLY } from "@/lib/site";

// The NEAR site follows Navy's copy rules (no em dashes) and card colours;
// the main site keeps its original card.
export const alt = NEAR_ONLY
  ? "Bound on NEAR: a surety bond for AI agents"
  : "Bound on NEAR — a surety bond for AI agents";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function NearOpengraphImage() {
  return NEAR_ONLY
    ? renderOgImage(
        "A surety bond for AI agents on NEAR: pre-funded, auditor-staked, and verifiable on NEAR testnet.",
        "Built at NEAR HACKATHON",
        "navy",
      )
    : renderOgImage(
        "A surety bond for AI agents on NEAR — pre-funded, auditor-staked, and verifiable on NEAR testnet.",
        "Built at NEAR HACKATHON",
      );
}
