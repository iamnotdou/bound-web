import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";

export function AppHeader() {
  return (
    <header className="bg-background/80 border-border sticky top-0 z-40 w-full border-b backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/app" aria-label="Bound marketplace">
          <Logo />
        </Link>

        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">Back to boundprotocol.dev</span>
          <span className="sm:hidden">Site</span>
        </Link>
      </div>
    </header>
  );
}
