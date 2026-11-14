import { OG_SIZE, renderOgImage } from "@/lib/og-image";

export const alt = "Bound — A surety bond for AI agents, on-chain";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpengraphImage() {
  return renderOgImage(
    "A surety bond for AI agents — pre-funded, auditor-staked, and verifiable on Stellar.",
    "github.com/iamnotdou/bound",
  );
}
