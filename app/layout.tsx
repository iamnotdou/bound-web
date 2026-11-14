import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { NEAR_ONLY, SITE_URL } from "@/lib/site";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

// The NEAR-only deploy gets NEAR defaults, so a page that sets no metadata
// of its own never inherits the main site's copy.
const title = NEAR_ONLY
  ? "Bound on NEAR: bonded and insured AI agents"
  : "Bound — A surety bond for AI agents, on-chain";
const description = NEAR_ONLY
  ? "The bond-and-insurance layer for AI agents on NEAR: a locked reserve and an auditor's slashable stake pay the people an agent harms, and one view call shows the cover. Live on NEAR testnet."
  : "Know your worst case before you transact. Bound replaces “can I trust this agent?” with a number you can look up: a pre-funded, auditor-staked worst-case loss, verifiable on Stellar.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: title,
    template: "%s — Bound",
  },
  description,
  icons: {
    icon: [
      { url: "/mini-logo.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/apple-icon.png",
  },
  openGraph: {
    title,
    description,
    siteName: NEAR_ONLY ? "Bound on NEAR" : "Bound",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // The NEAR-only deploy wears the Navy theme (app/navy.css): every
      // rule there is scoped to this attribute, so the main site is untouched.
      data-theme={NEAR_ONLY ? "navy" : undefined}
      className={cn(
        "h-full",
        "antialiased",
        "font-sans",
        !NEAR_ONLY && outfit.variable,
      )}
    >
      {NEAR_ONLY && (
        <head>
          {/* Switzer, Navy's one family, from Fontshare: NEAR-only builds. */}
          <link
            rel="preconnect"
            href="https://api.fontshare.com"
            crossOrigin=""
          />
          <link
            rel="stylesheet"
            href="https://api.fontshare.com/v2/css?f[]=switzer@400,500,600,601&display=swap"
          />
        </head>
      )}
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
