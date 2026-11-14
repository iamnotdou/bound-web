import type { Metadata } from "next";
import { NEAR_GITHUB_URL } from "./links";

/**
 * The NEAR docs table of contents: one entry per page under
 * `app/(near)/docs`. The sidebar, the prev/next links, the per-page
 * metadata and the sitemap all read this list, so a page added here shows
 * up everywhere at once. Pure data; safe on both sides of the
 * server/client line.
 */
export interface DocPage {
  /** "" for the docs index (`/docs`). */
  slug: string;
  title: string;
  /** The word(s) of the title set in italic semibold in the page's h1. */
  emphasis?: string;
  description: string;
  group: "Start" | "Protocol" | "Build" | "Reference";
}

export const DOC_PAGES: readonly DocPage[] = [
  {
    slug: "",
    title: "Overview",
    description:
      "What Bound is on NEAR: a pre-funded reserve, an auditor's slashable stake and a spend meter behind one agent account.",
    group: "Start",
  },
  {
    slug: "quickstart",
    title: "Quickstart",
    description:
      "Verify a NEAR agent in one minute from the web, the CLI, HTTP or MCP, then run the demo from the repository.",
    group: "Start",
  },
  {
    slug: "how-it-works",
    title: "How it works",
    emphasis: "works",
    description:
      "The certificate lifecycle: publish, accept, fund, attest, pay, halt, challenge, close_window and release.",
    group: "Protocol",
  },
  {
    slug: "key-confinement",
    title: "Key confinement",
    emphasis: "confinement",
    description:
      "Why the agent holds only a pay-only function-call key and no code, and how to check that yourself.",
    group: "Protocol",
  },
  {
    slug: "trust-model",
    title: "Trust model and limits",
    emphasis: "limits",
    description:
      "Who holds which role on testnet, what a certificate does not protect, and the known limitations.",
    group: "Protocol",
  },
  {
    slug: "sdk",
    title: "SDK",
    description:
      "The @bound/near TypeScript library: verifyAgent, checkConfinement, certificate reads and pure helpers.",
    group: "Build",
  },
  {
    slug: "cli",
    title: "CLI",
    description:
      "bound-near verify, cert and mcp: options, output and exit codes.",
    group: "Build",
  },
  {
    slug: "mcp",
    title: "MCP server",
    emphasis: "server",
    description:
      "Four tools that let an LLM agent verify a counterparty and pay through the metered pay method.",
    group: "Build",
  },
  {
    slug: "http-api",
    title: "HTTP API",
    description:
      "GET /api/near/verify/<agent>: the verdict, the certificate and the agent's confinement as JSON.",
    group: "Build",
  },
  {
    slug: "contract",
    title: "Contract reference",
    emphasis: "reference",
    description:
      "Every public method and view of the Bound contract: arguments, caller, deposit and errors. Plus the mock USDC token.",
    group: "Reference",
  },
  {
    slug: "deployments",
    title: "Deployments",
    description:
      "Testnet accounts, code hashes, how to check the wasm, and every recorded demo run.",
    group: "Reference",
  },
  {
    slug: "security",
    title: "Security",
    description:
      "The security checklist and the review findings fixed before submission.",
    group: "Reference",
  },
];

export const DOC_GROUPS: readonly DocPage["group"][] = [
  "Start",
  "Protocol",
  "Build",
  "Reference",
];

export const docHref = (slug: string) => (slug ? `/docs/${slug}` : "/docs");

export function getDocPage(slug: string): DocPage {
  const page = DOC_PAGES.find((p) => p.slug === slug);
  if (!page) throw new Error(`unknown docs page: ${slug}`);
  return page;
}

/** Reading order follows the sidebar: groups in order, pages in order. */
const ORDERED = DOC_GROUPS.flatMap((g) =>
  DOC_PAGES.filter((p) => p.group === g),
);

export function docNeighbours(slug: string): {
  prev: DocPage | null;
  next: DocPage | null;
} {
  const i = ORDERED.findIndex((p) => p.slug === slug);
  return {
    prev: i > 0 ? ORDERED[i - 1] : null,
    next: i >= 0 && i < ORDERED.length - 1 ? ORDERED[i + 1] : null,
  };
}

/**
 * A page's own `openGraph` replaces the root one wholesale, images included,
 * so every docs page points at the site's card (`app/opengraph-image.tsx`).
 */
const DOCS_OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Bound on NEAR — a surety bond for AI agents",
} as const;

export function docMetadata(slug: string): Metadata {
  const page = getDocPage(slug);
  const title =
    page.slug === ""
      ? "Docs — Bound on NEAR"
      : `${page.title} — Bound on NEAR docs`;
  const url = docHref(page.slug);
  return {
    title: { absolute: title },
    description: page.description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: page.description,
      url,
      siteName: "Bound on NEAR",
      type: "article",
      images: [DOCS_OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: page.description,
      images: [DOCS_OG_IMAGE.url],
    },
  };
}

/** Source links the docs cite. All on the near-hackathon branch. */
const BLOB = NEAR_GITHUB_URL.replace("/tree/", "/blob/");
export const SOURCE = {
  design: `${BLOB}/near/DESIGN.md`,
  designSection: (n: number, anchor: string) =>
    `${BLOB}/near/DESIGN.md#${n}-${anchor}`,
  readme: `${BLOB}/near/README.md`,
  contract: `${BLOB}/near/contracts/bound/src/lib.rs`,
  settle: `${BLOB}/near/contracts/bound/src/settle.rs`,
  tests: `${BLOB}/near/contracts/bound/src/tests.rs`,
  token: `${BLOB}/near/contracts/mock-usdc/src/lib.rs`,
  deployment: `${BLOB}/near/deployments/testnet.json`,
  evidence: `${NEAR_GITHUB_URL}/near/evidence`,
  verifySh: `${BLOB}/near/scripts/verify.sh`,
  pkg: `${NEAR_GITHUB_URL}/packages/near`,
} as const;
