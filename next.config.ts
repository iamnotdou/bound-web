import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // The pitch deck is a single self-contained HTML file in `public/`, served
    // from this domain so the link in a submission form is ours and needs no
    // password. A rewrite rather than a redirect: `/deck` is the address we
    // hand out, and `.html` is an implementation detail nobody should have to
    // type or trust.
    return [{ source: "/deck", destination: "/deck.html" }];
  },
  async redirects() {
    // Documentation lives on its own deploy at docs.boundprotocol.dev. Every
    // in-app link still points at /docs, so this is the single place that
    // knows where the docs actually are.
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
