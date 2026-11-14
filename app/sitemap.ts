import type { MetadataRoute } from "next";
import { DOC_PAGES, docHref } from "@/lib/near/docs";
import { NEAR_ONLY, SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = NEAR_ONLY
    ? ["", "/app/near", ...DOC_PAGES.map((p) => docHref(p.slug)), "/deck"]
    : ["", "/blog", "/app", "/contact"];
  return paths.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" || NEAR_ONLY ? "weekly" : "monthly",
    priority: path === "" || NEAR_ONLY ? 1 : 0.5,
  }));
}
