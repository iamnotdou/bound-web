/**
 * A Stellar account id as a wallet hands it over: `G` plus 55 base32 characters.
 * This is a shape check for inline form validation, not a checksum — the real
 * verdict on an address comes from the build simulation on the server.
 */
const ACCOUNT_ID = /^G[A-Z2-7]{55}$/;

export function isAccountId(value: string): boolean {
  return ACCOUNT_ID.test(value.trim());
}
