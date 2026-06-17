/** Shared anti-spam field names + threshold. Kept in their own module (no
 *  next/headers import) so the client <Honeypot> and the server-only checks in
 *  antispam.ts can both use them without pulling server APIs into the client. */
export const HONEYPOT_FIELD = "company_website"; // looks real to bots, unused by us
export const HONEYPOT_TS = "_ts"; // ms timestamp set client-side when the form loaded
export const MIN_FILL_MS = 2000; // a human can't complete + submit a real form this fast
