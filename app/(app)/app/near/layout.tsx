import type { Metadata } from "next";

const title = "Bound on NEAR — a surety bond for AI agents";
const description =
  "Know a NEAR agent's worst case before you deal with it: a pre-funded reserve, an auditor's slashable stake, and a spend meter its function-call key cannot route around. Read live from NEAR testnet, no wallet needed.";

export const metadata: Metadata = {
  title: {
    default: "Bound on NEAR testnet",
    template: "%s — Bound on NEAR",
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
