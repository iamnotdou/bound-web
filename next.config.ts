import type { NextConfig } from "next";

// Read directly rather than from lib/site.ts: this file is evaluated by the
// Next CLI before the app's module graph exists.
const NEAR_ONLY = process.env.NEXT_PUBLIC_NEAR_ONLY === "1";

const nextConfig: NextConfig = {
  async rewrites() {
    // The pitch deck is a single self-contained HTML file in `public/`, served
    // from this domain so the link in a submission form is ours and needs no
    // password. A rewrite rather than a redirect: `/deck` is the address we
    // hand out, and `.html` is an implementation detail nobody should have to
    // type or trust. The NEAR-only deploy hands out its own deck.
    return [
      {
        source: "/deck",
        destination: NEAR_ONLY ? "/near-deck.html" : "/deck.html",
      },
    ];
  },
  async redirects() {
    // Documentation lives on its own deploy at docs.boundprotocol.dev. Every
    // in-app link still points at /docs, so this is the single place that
    // knows where the docs actually are. The NEAR-only deploy serves its own
    // docs from app/(near)/docs, so it skips the redirect.
    if (NEAR_ONLY) return [];
    return [
      {
        source: "/docs",
        destination: "https://docs.boundprotocol.dev",
        permanent: false,
      },
      {
        source: "/docs/:path*",
        destination: "https://docs.boundprotocol.dev/docs/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
