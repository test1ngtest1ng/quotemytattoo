// Single source of truth for the site's base URL. Used in transactional email
// links, auth redirects, canonical URLs and the sitemap. Set NEXT_PUBLIC_SITE_URL
// per environment (e.g. http://localhost:3100 in dev, https://quotemytattoo.co.uk
// in prod). The fallback is the production domain so a missing env var can never
// leak localhost into emails or search engines.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://quotemytattoo.co.uk";
