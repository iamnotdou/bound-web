import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SITE_URL } from "@/lib/site";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

const title = "Bound — A surety bond for AI agents, on-chain";
const description =
  "Know your worst case before you transact. Bound replaces “can I trust this agent?” with a number you can look up: a pre-funded, auditor-staked worst-case loss, verifiable on Stellar.";

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
    siteName: "Bound",
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
      className={cn("h-full", "antialiased", "font-sans", outfit.variable)}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
