import { TATTOO_STYLES } from "@/lib/constants";

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export type StyleEntry = { name: string; slug: string };

export const STYLES: StyleEntry[] = TATTOO_STYLES.map((name) => ({ name, slug: slugify(name) }));

export const getStyle = (slug: string) => STYLES.find((s) => s.slug === slug);
export const styleSlug = (name: string) => slugify(name);
