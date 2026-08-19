import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "App" };

export default function AppPage() {
  return (
    <ComingSoon
      title="The Bound App"
      description="Issue bonds, look up agents, and track claims — the app is under construction."
    />
  );
}
