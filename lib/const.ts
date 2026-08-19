import { Clock2, Zap, ScrollText, FileCheck2 } from "lucide-react";

const MESCHAC_AVATAR = "/avatars/pin-3.png";
const BERNARD_AVATAR = "/avatars/pin-3.png";
const THEO_AVATAR = "/avatars/pin-2.png";
const GLODIE_AVATAR = "/avatars/pin-1.png";
const SHADCN_AVATAR = "/avatars/pin-2.png";

export const SUB_FEATURES = [
  {
    icon: Zap,
    title: "Instant Lookup",
    description:
      "Resolve any agent ID to its live bond — coverage, status, and auditors.",
  },
  {
    icon: Clock2,
    title: "Real-time Bond Status",
    description:
      "Coverage, stakes, and expiry update as they change on Stellar.",
  },
  {
    icon: ScrollText,
    title: "SDK Integration",
    description:
      "Check bonds and gate transactions in a few lines with @bound/sdk.",
  },
  {
    icon: FileCheck2,
    title: "Claim History",
    description:
      "Every claim and payout is public, so track records are verifiable.",
  },
];

export {
  BERNARD_AVATAR,
  GLODIE_AVATAR,
  THEO_AVATAR,
  MESCHAC_AVATAR,
  SHADCN_AVATAR,
};
