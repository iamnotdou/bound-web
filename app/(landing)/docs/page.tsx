import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Docs" };

export default function DocsPage() {
  return (
    <ComingSoon
      title="Documentation"
      description="Guides and references for the Bound SDK, CLI, and MCP server are on the way. Until then, the repository README is the best place to start."
    />
  );
}
