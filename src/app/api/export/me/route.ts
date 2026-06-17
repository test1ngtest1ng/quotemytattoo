import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GDPR data export: lets a signed-in user download everything we hold about
 * their account as a single JSON file. Gated by the user's own session; uses the
 * service-role client to gather their related rows. Each query falls back to []
 * so a single missing column/table can't break the whole export.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/account", process.env.NEXT_PUBLIC_SITE_URL ?? "https://quotemytattoo.co.uk"));
  }

  const admin = createAdminClient();
  const uid = user.id;
  const rows = async (q: PromiseLike<{ data: unknown }>) => ((await q).data as unknown[]) ?? [];
  const one = async (q: PromiseLike<{ data: unknown }>) => (await q).data ?? null;

  const profile = await one(admin.from("profiles").select("*").eq("id", uid).maybeSingle());
  const artist = (await one(admin.from("artists").select("*").eq("profile_id", uid).maybeSingle())) as { id?: string } | null;
  const studio = await one(admin.from("studios").select("*").eq("owner_profile_id", uid).maybeSingle());
  const artistId = artist?.id ?? null;

  const requests = await rows(admin.from("tattoo_requests").select("*").eq("customer_id", uid));
  const reqIds = (requests as { id?: string }[]).map((r) => r.id).filter(Boolean) as string[];
  const requestImages = reqIds.length ? await rows(admin.from("request_images").select("*").in("request_id", reqIds)) : [];

  const quotesSent = artistId ? await rows(admin.from("quotes").select("*").eq("artist_id", artistId)) : [];

  const convCustomer = await rows(admin.from("conversations").select("*").eq("customer_id", uid));
  const convArtist = artistId ? await rows(admin.from("conversations").select("*").eq("artist_id", artistId)) : [];
  const conversations = [...convCustomer, ...convArtist];
  const convIds = (conversations as { id?: string }[]).map((c) => c.id).filter(Boolean) as string[];
  const messages = convIds.length ? await rows(admin.from("messages").select("*").in("conversation_id", convIds)) : [];

  const connByReq = reqIds.length ? await rows(admin.from("connections").select("*").in("request_id", reqIds)) : [];
  const connByArtist = artistId ? await rows(admin.from("connections").select("*").eq("artist_id", artistId)) : [];
  const connMap = new Map<string, unknown>();
  for (const c of [...connByReq, ...connByArtist] as { id?: string }[]) if (c.id) connMap.set(c.id, c);
  const connections = [...connMap.values()];

  const reviewsWritten = await rows(admin.from("reviews").select("*").eq("customer_id", uid));
  const reviewsReceived = artistId ? await rows(admin.from("reviews").select("*").eq("artist_id", artistId)) : [];
  const savedArtists = await rows(admin.from("saved_artists").select("*").eq("customer_id", uid));
  const notifications = await rows(admin.from("notifications").select("*").eq("user_id", uid));
  const reports = await rows(admin.from("reports").select("*").eq("reporter_id", uid));

  const payload = {
    exported_at: new Date().toISOString(),
    note: "Your personal data held by Quote My Tattoo. Includes records you created and (if you're an artist) records linked to your artist profile.",
    account: { id: uid, email: user.email ?? null, created_at: user.created_at ?? null },
    profile,
    artist,
    studio,
    tattoo_requests: requests,
    request_images: requestImages,
    quotes_sent: quotesSent,
    conversations,
    messages,
    connections,
    reviews_written: reviewsWritten,
    reviews_received: reviewsReceived,
    saved_artists: savedArtists,
    notifications,
    reports,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="quotemytattoo-data.json"',
      "cache-control": "no-store",
    },
  });
}
