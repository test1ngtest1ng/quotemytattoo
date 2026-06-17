import type { NextConfig } from "next";

// Allow next/image to optimise images served from Supabase Storage public
// buckets (portfolio, review-images, chat-images). The wildcard covers any
// Supabase project ref across dev/prod; the exact host (from the env URL) is
// added too when available. next/image throws on un-allowlisted hosts.
const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : undefined;
  } catch {
    return undefined;
  }
})();

const nextConfig: NextConfig = {
  // Guest request submissions POST their (compressed) reference images through a
  // server action, so the default 1MB action body limit is too small.
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      ...(supabaseHost
        ? [{ protocol: "https" as const, hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
        : []),
    ],
  },
};

export default nextConfig;
