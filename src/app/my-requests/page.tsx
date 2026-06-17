import "@/styles/account-requests.css";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { MyRequestsList, type RequestRow } from "@/components/requests/MyRequestsList";

export const metadata: Metadata = {
  title: "My Requests",
  robots: { index: false, follow: false },
};

export default async function MyRequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/my-requests");

  const { data } = await supabase
    .from("tattoo_requests")
    .select(
      "id, title, style, size_category, location_area, status, expires_at, created_at, quotes(count), conversations(count), booked:artists!tattoo_requests_booked_artist_id_fkey(display_name), request_images(storage_path, created_at)",
    )
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  const requests: RequestRow[] = await Promise.all(
    (data ?? []).map(async (r) => {
      // The customer's first reference image becomes the card thumbnail.
      // request-images is a private bucket → sign a short-lived URL.
      const imgs = (r.request_images as { storage_path: string; created_at: string }[] | null) ?? [];
      const first = [...imgs].sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
      let thumbnail: string | null = null;
      if (first) {
        const { data: signed } = await supabase.storage
          .from("request-images")
          .createSignedUrl(first.storage_path, 3600);
        thumbnail = signed?.signedUrl ?? null;
      }
      return {
        id: r.id,
        title: r.title,
        style: r.style,
        size_category: r.size_category,
        location_area: r.location_area,
        status: r.status,
        expires_at: r.expires_at,
        created_at: r.created_at,
        quoteCount: (r.quotes as { count: number }[] | null)?.[0]?.count ?? 0,
        chatCount: (r.conversations as { count: number }[] | null)?.[0]?.count ?? 0,
        bookedArtist: (() => {
          const bk = r.booked as { display_name?: string } | { display_name?: string }[] | null;
          const obj = Array.isArray(bk) ? bk[0] : bk;
          return obj?.display_name ?? null;
        })(),
        thumbnail,
      };
    }),
  );

  return (
    <>
      <AppHeader />
      <main className="page">
        <div className="wrap">
          <div className="ph">
            <h1>My Requests</h1>
            <Link className="btn" href="/new-request">New Request</Link>
          </div>
          <MyRequestsList requests={requests} />
        </div>
      </main>
    </>
  );
}
