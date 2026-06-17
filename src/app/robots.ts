import type { MetadataRoute } from "next";

import { SITE_URL as SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep private / app routes out of the index (also noindexed per-page).
        // Trailing slashes on /artist/ and /studio/ are deliberate so the public
        // /artists and /studios profile pages stay crawlable.
        disallow: [
          "/dashboard",
          "/new-request",
          "/auth/",
          "/login",
          "/signup",
          "/admin",
          "/account",
          "/saved",
          "/my-requests",
          "/requests",
          "/artist/",
          "/studio/",
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
