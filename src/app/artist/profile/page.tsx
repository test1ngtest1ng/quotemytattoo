import "@/styles/account.css";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { ArtistProfileManager, type PortfolioPic, type ArtistReview } from "@/components/account/ArtistProfileManager";

export const metadata: Metadata = {
  title: "Your Artist Profile",
  robots: { index: false, follow: false },
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const reviewWhen = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" });

export default async function ArtistProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/artist/profile");

  const { data: a } = await supabase
    .from("artists")
    .select("id, display_name, business_name, bio, styles, location_area, location_postcode, address_line, travel_areas, instagram_url, tiktok_url, insured, licensed, hygiene_certified, first_aid")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!a) redirect("/artist/onboarding");

  const { data: pics } = await supabase
    .from("portfolio_images")
    .select("id, storage_path, position")
    .eq("artist_id", a.id)
    .order("position");

  const { data: revs } = await supabase
    .from("reviews")
    .select("id, rating, title, body, created_at")
    .eq("artist_id", a.id)
    .eq("hidden", false)
    .order("created_at", { ascending: false });

  const portfolio: PortfolioPic[] = (pics ?? []).map((p) => ({
    id: p.id,
    path: p.storage_path,
    url: `${SUPABASE_URL}/storage/v1/object/public/portfolio/${p.storage_path}`,
  }));
  const reviews: ArtistReview[] = (revs ?? []).map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    when: reviewWhen(r.created_at),
  }));

  return (
    <>
      <AppHeader />
      <main className="page">
        <div className="wrap">
          <h1 className="ptitle">Your Artist Profile</h1>
          <ArtistProfileManager
            data={{
              display_name: a.display_name ?? "",
              business_name: a.business_name ?? "",
              bio: a.bio ?? "",
              styles: a.styles ?? [],
              location_area: a.location_area ?? "",
              location_postcode: a.location_postcode ?? "",
              address_line: a.address_line ?? "",
              travel_areas: (a.travel_areas ?? []).join(", "),
              instagram_url: a.instagram_url ?? "",
              tiktok_url: a.tiktok_url ?? "",
              insured: !!a.insured,
              licensed: !!a.licensed,
              hygiene_certified: !!a.hygiene_certified,
              first_aid: !!a.first_aid,
            }}
            portfolio={portfolio}
            reviews={reviews}
            notice={saved ? { type: "ok", text: "Saved." } : undefined}
            initialTab={saved === "portfolio" ? "portfolio" : undefined}
          />
        </div>
      </main>
    </>
  );
}
