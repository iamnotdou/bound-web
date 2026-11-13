/** True on `/app/near` and every page under it. Pure, safe on both sides. */
export function isNearRoute(pathname: string | null): boolean {
  return (
    pathname !== null &&
    (pathname === "/app/near" || pathname.startsWith("/app/near/"))
  );
}
