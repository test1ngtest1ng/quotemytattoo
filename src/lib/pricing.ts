// Single source of truth for membership pricing.
//
// Right now the platform is FREE for everyone (customers and artists) to build
// traffic. When you're ready to charge, flip `billingLive` to true - every price
// label across the site reads from here, so the copy updates in one place.
//
// Future paid model: £20/mo for artists after a 30-day free trial ("first month
// free"); founding members (first 50) lock in 50% off. Customers are always free.
export const PRICING = {
  billingLive: false, // false = free for everyone during launch
  currency: "£",
  artistMonthly: 20,
  studioMonthly: 50,
  trialDays: 30, // "first month free" once billing is live
  foundingDiscountPct: 50, // founding members pay half
  foundingCap: 50, // total founding-member slots
  foundingDeadline: "31 December 2026",
} as const;

/** Founding price for a given standard monthly (e.g. £20 -> £10). */
export function foundingMonthly(standard: number): number {
  return Math.round(standard * (1 - PRICING.foundingDiscountPct / 100));
}

/** Short price for a plan card / signup, e.g. "Free" now or "£20/mo" when live. */
export function planPriceLabel(monthly: number): string {
  return PRICING.billingLive ? `${PRICING.currency}${monthly}/mo` : "Free";
}

/**
 * One-line plan summary. While free: "Free during launch · planned £20/mo
 * (£10/mo founding)". When live: "£20/mo · first month free".
 */
export function planSummary(monthly: number): string {
  const f = foundingMonthly(monthly);
  if (!PRICING.billingLive) {
    return `Free during launch · planned ${PRICING.currency}${monthly}/mo (${PRICING.currency}${f}/mo founding)`;
  }
  return `${PRICING.currency}${monthly}/mo · first ${PRICING.trialDays} days free · ${PRICING.currency}${f}/mo for founding members`;
}
