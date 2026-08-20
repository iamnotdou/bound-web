import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
