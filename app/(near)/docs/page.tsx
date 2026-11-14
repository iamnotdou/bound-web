import type { Metadata } from "next";
import Link from "next/link";
import { NEAR_GITHUB_URL, NEAR_NPM_URL } from "@/lib/near/links";

/**
 * PLACEHOLDER. The docs for the NEAR site live under `app/(near)/docs/`
 * (this group's layout already gives them the NEAR header and footer; on
 * the main site `/docs` is redirected by `next.config.ts` and never gets
 * here). Replace this page with the docs index and add pages beside it.
 */
export const metadata: Metadata = {
  title: { absolute: "Docs — Bound on NEAR" },
  description:
    "How to read and act on a Bound certificate on NEAR: the contract, the @bound/near package, its CLI and its MCP server.",
};

export default function NearDocsPlaceholder() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-foreground text-3xl font-semibold tracking-tight">
        Docs
      </h1>
      <p className="text-muted-foreground mt-3 text-balance">
        The full guide is on its way. Until then, the source and its README are
        on{" "}
        <a className="text-primary underline" href={NEAR_GITHUB_URL}>
          GitHub
        </a>
        , the package is{" "}
        <a className="text-primary font-address underline" href={NEAR_NPM_URL}>
          @bound/near
        </a>
        , and the{" "}
        <Link className="text-primary underline" href="/app/near">
          app
        </Link>{" "}
        reads every certificate live.
      </p>
    </div>
  );
}
