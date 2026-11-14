import type { MetadataRoute } from "next";
import { NEAR_ONLY, SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = NEAR_ONLY ? ["/app/near"] : ["", "/blog", "/app", "/contact"];
  return paths.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" || NEAR_ONLY ? "weekly" : "monthly",
    priority: path === "" || NEAR_ONLY ? 1 : 0.5,
  }));
}
