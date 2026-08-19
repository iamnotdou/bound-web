import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Blog" };

export default function BlogPage() {
  return (
    <ComingSoon
      title="Blog"
      description="Writing on bonds, auditor staking, and the agent economy is coming soon."
    />
  );
}
