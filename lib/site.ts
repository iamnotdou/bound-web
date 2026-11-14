export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NODE_ENV === "production"
    ? "https://boundprotocol.dev"
    : "http://localhost:3000");

/**
 * NEAR-only deploy (near.boundprotocol.dev): every route outside the NEAR
 * pages redirects to /app/near and the header drops the link to the main
 * site. Set NEXT_PUBLIC_NEAR_ONLY=1 at build time; unset everywhere else.
 */
export const NEAR_ONLY = process.env.NEXT_PUBLIC_NEAR_ONLY === "1";
