"use server";

import { revalidatePath } from "next/cache";

/**
 * Drop the cached marketplace render after a certificate lands on-chain.
 *
 * `/app` is prerendered and revalidated on a 30s timer, which is right for a
 * passive reader and wrong for the person who just published: they must see
 * their own certificate immediately. A Server Action is the documented way to
 * invalidate a path from a Client Component — `revalidatePath` cannot be called
 * from the browser, and the route handlers that build and submit the
 * transaction are generic, so neither of them is the place to know that a
 * marketplace page exists.
 */
export async function revalidateMarketplace(certId: number | null) {
  revalidatePath("/app");
  // The auditor console's queue is built from live vault balances, so a
  // certificate that has just been funded belongs on it immediately — and one
  // that has just been attested belongs off it.
  revalidatePath("/app/auditor");
  if (certId !== null) revalidatePath(`/app/cert/${certId}`);
}
