import { NextResponse, type NextRequest } from "next/server";
import { NEAR_ONLY } from "@/lib/site";

/**
 * NEAR-only deploy: everything outside the NEAR pages, their API and the
 * shared static assets redirects to /app/near. A no-op on the main site.
 */
const ALLOWED = [
  /^\/app\/near(\/|$)/,
  /^\/api\/near(\/|$)/,
  /^\/_next\//,
  /^\/(favicon\.ico|icon\.png|apple-icon\.png|mini-logo\.svg|logo\.png|robots\.txt|sitemap\.xml)$/,
];

export function proxy(request: NextRequest) {
  if (!NEAR_ONLY) return NextResponse.next();
  const { pathname } = request.nextUrl;
  if (ALLOWED.some((re) => re.test(pathname))) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/app/near";
  url.search = "";
  return NextResponse.redirect(url, 307);
}
