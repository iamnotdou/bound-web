import type { Metadata } from "next";
import { NEAR_ONLY } from "@/lib/site";

// The NEAR site follows Navy's copy rules (no em dashes); the main site
// keeps its original strings.
const title = NEAR_ONLY
  ? "Bound on NEAR: bonded and insured AI agents"
  : "Bound on NEAR — a surety bond for AI agents";
const description = NEAR_ONLY
  ? "Check a NEAR agent's bond and cover before you deal with it: a locked reserve, an auditor's slashable stake, and a spend meter its function-call key cannot route around. Read live from NEAR testnet, no wallet needed."
  : "Know a NEAR agent's worst case before you deal with it: a pre-funded reserve, an auditor's slashable stake, and a spend meter its function-call key cannot route around. Read live from NEAR testnet, no wallet needed.";

export const metadata: Metadata = {
  title: {
    default: "Bound on NEAR testnet",
    template: NEAR_ONLY ? "%s, Bound on NEAR" : "%s — Bound on NEAR",
  },
  description,
  openGraph: { title, description, siteName: "Bound on NEAR", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

export default function NearLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
