import type { SizeCategory } from "@/lib/types";

// Tattoo styles - used in the customer request wizard and artist onboarding.
// Keep these in sync on both sides so matching works on exact strings.
export const TATTOO_STYLES = [
  "Fine line",
  "Black & grey",
  "Colour",
  "Realism",
  "Traditional",
  "Neo-traditional",
  "Japanese",
  "Blackwork",
  "Dotwork",
  "Geometric",
  "Lettering / script",
  "Micro / minimal",
  "Botanical",
  "Watercolour",
  "Portrait",
  "Cover-up",
] as const;

export type TattooStyle = (typeof TATTOO_STYLES)[number];

// Max styles an artist can select during onboarding (mirrors MyBuilder's "up to 5").
export const MAX_ARTIST_STYLES = 5;

// Size options with indicative price ranges (£), carried over from the
// home-page request wizard so estimates stay consistent.
export const SIZE_OPTIONS: {
  value: SizeCategory;
  label: string;
  hint: string;
  priceMin: number;
  priceMax: number;
}[] = [
  { value: "tiny", label: "Tiny", hint: "Coin-sized", priceMin: 90, priceMax: 180 },
  { value: "small", label: "Small", hint: "Palm-ish", priceMin: 160, priceMax: 340 },
  { value: "medium", label: "Medium", hint: "Hand-sized", priceMin: 320, priceMax: 650 },
  { value: "large", label: "Large", hint: "Half a limb", priceMin: 650, priceMax: 1200 },
  { value: "sleeve", label: "Sleeve / large piece", hint: "Multi-session", priceMin: 1300, priceMax: 3200 },
];

// Self-declared trust badges shown on artist profiles.
export const TRUST_BADGES = [
  { key: "insured", label: "Insured" },
  { key: "licensed", label: "Licensed / council-registered" },
  { key: "hygiene_certified", label: "Hygiene certified" },
  { key: "first_aid", label: "First-aid trained" },
] as const;

// Founding Member programme. Pricing/cap now live in @/lib/pricing (PRICING).
export const FOUNDING_CAP_PER_TYPE = 50;
export const FOUNDING_DEADLINE = "2026-12-31";
