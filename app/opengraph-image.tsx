import { OG_SIZE, renderOgImage } from "@/lib/og-image";
import { NEAR_ONLY } from "@/lib/site";

export const alt = NEAR_ONLY
  ? "Bound on NEAR — a surety bond for AI agents"
  : "Bound — A surety bond for AI agents, on-chain";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpengraphImage() {
  if (NEAR_ONLY) {
    return renderOgImage(
      "A surety bond for AI agents on NEAR — pre-funded, auditor-staked, and verifiable on NEAR testnet.",
      "Built at NEAR HACKATHON",
    );
  }
  return renderOgImage(
    "A surety bond for AI agents — pre-funded, auditor-staked, and verifiable on Stellar.",
    "github.com/iamnotdou/bound",
  );
}
