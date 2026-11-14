import { OG_SIZE, renderOgImage } from "@/lib/og-image";

export const alt =
  "Bound on NEAR: know an agent's worst case before you deal with it";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function NearHomeOpengraphImage() {
  return renderOgImage(
    "A surety bond for NEAR agents: a pre-funded reserve, an auditor's slashable stake and a spend meter, live on NEAR testnet.",
    "Built at NEAR HACKATHON",
  );
}
