import { OG_SIZE, renderOgImage } from "@/lib/og-image";

export const alt = "Bound on NEAR — a surety bond for AI agents";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function NearOpengraphImage() {
  return renderOgImage(
    "A surety bond for AI agents on NEAR — pre-funded, auditor-staked, and verifiable on NEAR testnet.",
    "Built at NEAR HACKATHON",
  );
}
