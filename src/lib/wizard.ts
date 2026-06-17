import { SIZE_OPTIONS } from "@/lib/constants";
import type { SizeCategory } from "@/lib/types";

// Body-diagram tappable zones (ported from the home-page mockup).
// Coordinates are for an SVG viewBox of 0 0 300 470.
export type Zone = {
  id: string;
  label: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
};

export type BodyView = "front" | "back";

export const ZONES: Record<BodyView, Zone[]> = {
  front: [
    { id: "chest", label: "Chest", cx: 150, cy: 118, rx: 30, ry: 17 },
    { id: "stomach", label: "Stomach / ribs", cx: 150, cy: 185, rx: 28, ry: 24 },
    { id: "uarm_l", label: "Upper arm (left)", cx: 102, cy: 118, rx: 12, ry: 26 },
    { id: "uarm_r", label: "Upper arm (right)", cx: 198, cy: 118, rx: 12, ry: 26 },
    { id: "fore_l", label: "Forearm (left)", cx: 102, cy: 178, rx: 11, ry: 24 },
    { id: "fore_r", label: "Forearm (right)", cx: 198, cy: 178, rx: 11, ry: 24 },
    { id: "hand_l", label: "Hand (left)", cx: 102, cy: 214, rx: 12, ry: 15 },
    { id: "hand_r", label: "Hand (right)", cx: 198, cy: 214, rx: 12, ry: 15 },
    { id: "thigh_l", label: "Thigh (left)", cx: 135, cy: 285, rx: 14, ry: 42 },
    { id: "thigh_r", label: "Thigh (right)", cx: 165, cy: 285, rx: 14, ry: 42 },
    { id: "calf_l", label: "Shin / calf (left)", cx: 135, cy: 375, rx: 12, ry: 34 },
    { id: "calf_r", label: "Shin / calf (right)", cx: 165, cy: 375, rx: 12, ry: 34 },
  ],
  back: [
    { id: "nape", label: "Nape of neck", cx: 150, cy: 78, rx: 18, ry: 12 },
    { id: "uback", label: "Upper back", cx: 150, cy: 120, rx: 32, ry: 20 },
    { id: "lback", label: "Lower back", cx: 150, cy: 185, rx: 28, ry: 22 },
    { id: "uarm_l", label: "Back of arm (left)", cx: 102, cy: 118, rx: 12, ry: 26 },
    { id: "uarm_r", label: "Back of arm (right)", cx: 198, cy: 118, rx: 12, ry: 26 },
    { id: "fore_l", label: "Forearm (left)", cx: 102, cy: 178, rx: 11, ry: 24 },
    { id: "fore_r", label: "Forearm (right)", cx: 198, cy: 178, rx: 11, ry: 24 },
    { id: "ham_l", label: "Hamstring (left)", cx: 135, cy: 285, rx: 14, ry: 42 },
    { id: "ham_r", label: "Hamstring (right)", cx: 165, cy: 285, rx: 14, ry: 42 },
    { id: "calf_l", label: "Calf (left)", cx: 135, cy: 375, rx: 12, ry: 34 },
    { id: "calf_r", label: "Calf (right)", cx: 165, cy: 375, rx: 12, ry: 34 },
  ],
};

// Map a stored zone id back to its human label (for display + emails).
export function zoneLabel(id: string | null | undefined): string | null {
  if (!id) return null;
  for (const v of ["front", "back"] as BodyView[]) {
    const z = ZONES[v].find((zone) => zone.id === id);
    if (z) return z.label;
  }
  return id;
}

// Placement affects price (hands/nape pricier; torso a bit more).
export function placementFactor(zoneId: string | null | undefined): number {
  if (!zoneId) return 1;
  if (/hand|nape/.test(zoneId)) return 1.25;
  if (/stomach|chest|uback|lback/.test(zoneId)) return 1.12;
  return 1.0;
}

const round10 = (n: number) => Math.round(n / 10) * 10;

export function computeRange(
  size: SizeCategory | null,
  zoneId: string | null,
): { lo: number; hi: number } | null {
  const sz = SIZE_OPTIONS.find((s) => s.value === size);
  if (!sz) return null;
  const pf = placementFactor(zoneId);
  return { lo: round10(sz.priceMin * pf), hi: round10(sz.priceMax * pf) };
}
