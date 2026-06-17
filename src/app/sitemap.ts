import type { MetadataRoute } from "next";
import { CITIES } from "@/lib/cities";
import { STYLES } from "@/lib/styles";
import { GUIDES } from "@/lib/guides";
import { createAdminClient } from "@/lib/supabase/admin";

import { SITE_URL as SITE } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Public artist + studio profiles (DB-driven, indexable).
  let artistEntries: MetadataRoute.Sitemap = [];
  let studioEntries: MetadataRoute.Sitemap = [];
  // Only city × style landing pages that actually have matching artists - empty
  // combos are thin/doorway pages, kept out of the sitemap (and noindexed on the
  // page itself). Internal links from the city pages still expose them to crawl.
  const cityStyleEntries: MetadataRoute.Sitemap = [];
  try {
    const admin = createAdminClient();
    const { data: artistsData } = await admin
      .from("artists")
      .select("slug, location_area, styles")
      .eq("profile_complete", true)
      .not("slug", "is", null);
    artistEntries = (artistsData ?? [])
      .filter((a) => a.slug)
      .map((a) => ({
        url: `${SITE}/artists/${a.slug}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));

    const pool = (artistsData ?? []) as { location_area: string | null; styles: string[] | null }[];
    for (const c of CITIES) {
      for (const s of STYLES) {
        const has = pool.some(
          (a) =>
            (a.location_area ?? "").toLowerCase().includes(c.name.toLowerCase()) &&
            Array.isArray(a.styles) &&
            a.styles.includes(s.name),
        );
        if (has) {
          cityStyleEntries.push({
            url: `${SITE}/tattoo-artists/${c.slug}/${s.slug}`,
            lastModified: now,
            changeFrequency: "weekly" as const,
            priority: 0.5,
          });
        }
      }
    }
    const { data: studiosData } = await admin
      .from("studios")
      .select("slug")
      .not("slug", "is", null);
    studioEntries = (studiosData ?? []).map((s) => ({
      url: `${SITE}/studios/${s.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    artistEntries = [];
    studioEntries = [];
  }

  return [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/for-artists`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/tattoo-artists`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/artists`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    ...["about", "careers", "press", "help", "quality-standards", "reviews-policy", "privacy", "terms", "cookies"].map((p) => ({
      url: `${SITE}/${p}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.3,
    })),
    ...CITIES.map((c) => ({
      url: `${SITE}/tattoo-artists/${c.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    // City × style landing pages (programmatic SEO) - only populated combos.
    ...cityStyleEntries,
    { url: `${SITE}/guides`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    ...GUIDES.map((g) => ({
      url: `${SITE}/guides/${g.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...artistEntries,
    ...studioEntries,
  ];
}
