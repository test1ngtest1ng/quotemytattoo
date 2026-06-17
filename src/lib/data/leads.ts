"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveUser } from "@/lib/auth/user";
import { sendEmail, escapeHtml } from "@/lib/email/resend";
import { createNotification } from "@/lib/notifications";
import { emailAllowed } from "@/lib/notification-prefs";

import { SITE_URL as SITE } from "@/lib/site";

/** Artist responds to a lead: records a quote, opens a conversation, and posts
 *  the quote as the first message. */
export async function sendQuote(formData: FormData) {
  const supabase = await createClient();
  const user = await requireActiveUser();

  const requestId = String(formData.get("request_id") ?? "");
  const priceRaw = String(formData.get("price_estimate") ?? "").replace(/[^0-9]/g, "");
  const priceEstimate = priceRaw ? parseInt(priceRaw, 10) : null;
  const priceNote = String(formData.get("price_note") ?? "").trim() || null;
  const message = String(formData.get("message") ?? "").trim();

  // Resolve the artist + the request's customer (admin: cross-user).
  const admin = createAdminClient();
  const { data: artist } = await admin
    .from("artists")
    .select("id, display_name, business_name, profile_complete, studios!artists_studio_id_fkey(name)")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!artist || !artist.profile_complete) redirect("/artist/onboarding");

  const studioName = (artist.studios as { name?: string } | null)?.name ?? null;
  const artistLabel = studioName || artist.business_name || artist.display_name || "an artist";

  const { data: req } = await admin
    .from("tattoo_requests")
    .select("id, title, customer_id, status, removed, expires_at, profiles!tattoo_requests_customer_id_fkey(email, name, notification_settings)")
    .eq("id", requestId)
    .maybeSingle();
  if (!req) redirect("/artist/leads");
  // Don't let artists quote a request that's no longer open.
  const expired = req.expires_at && new Date(req.expires_at) < new Date();
  if (req.removed || req.status !== "live" || expired) {
    redirect(`/artist/leads/${requestId}?error=${encodeURIComponent("This request is no longer accepting quotes.")}`);
  }

  // Is this a brand-new quote (vs editing an existing one)? Only ping on new.
  const { data: existingQuote } = await admin
    .from("quotes")
    .select("id")
    .eq("request_id", requestId)
    .eq("artist_id", artist.id)
    .maybeSingle();
  const isNewQuote = !existingQuote;

  // Quote (one per artist+request)
  await supabase.from("quotes").upsert(
    {
      request_id: requestId,
      artist_id: artist.id,
      price_estimate: priceEstimate,
      price_note: priceNote,
      message,
      status: "pending",
    },
    { onConflict: "request_id,artist_id" },
  );

  // Conversation (one per artist+request)
  const { data: convo } = await supabase
    .from("conversations")
    .upsert(
      { request_id: requestId, customer_id: req.customer_id, artist_id: artist.id },
      { onConflict: "request_id,artist_id" },
    )
    .select("id")
    .single();

  // First message = the quote
  if (convo && message) {
    const intro = priceEstimate
      ? `Quote: from £${priceEstimate}${priceNote ? ` (${priceNote})` : ""}\n\n${message}`
      : message;
    await supabase.from("messages").insert({
      conversation_id: convo.id,
      sender_id: user.id,
      body: intro,
    });
  }

  // Mark the match as responded
  await admin
    .from("request_matches")
    .update({ status: "responded" })
    .eq("request_id", requestId)
    .eq("artist_id", artist.id);

  // Touch the responsiveness signal (tolerant pre-0021).
  await admin.from("artists").update({ last_active: new Date().toISOString() }).eq("id", artist.id);

  // Notify the customer (in-app + email, fails soft). In-app ping on new quotes only.
  if (isNewQuote) {
    await createNotification(admin, {
      userId: req.customer_id as string,
      type: "new_quote",
      title: `New quote from ${artistLabel}`,
      body: (req.title as string) ?? "your request",
      href: `/requests/${requestId}`,
      requestId,
    });
  }
  const customer = req.profiles as { email?: string; name?: string; notification_settings?: unknown } | null;
  if (customer?.email && emailAllowed(customer.notification_settings, "quotes_email")) {
    await sendEmail({
      to: customer.email,
      subject: `New quote from ${artistLabel} - Quote My Tattoo`,
      html: `<div style="font-family:Figtree,Arial,sans-serif;color:#2a2233">
        <h2 style="color:#311a41">You've got a new quote</h2>
        <p>${escapeHtml(artistLabel)} has responded to your tattoo request${priceEstimate ? ` with an estimate from <strong>£${priceEstimate}</strong>` : ""}.</p>
        <p><a href="${SITE}/requests/${requestId}" style="background:#6a2e96;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600">View the quote</a></p>
      </div>`,
    });
  }

  revalidatePath(`/artist/leads/${requestId}`);
  redirect(`/artist/leads/${requestId}?sent=1`);
}

/** Artist passes on a matched lead - moves it out of their active leads. Only
 *  un-quoted leads can be passed; reversible. */
export async function passLead(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const requestId = String(formData.get("request_id") ?? "");
  if (!requestId) return;
  const admin = createAdminClient();
  const { data: artist } = await admin.from("artists").select("id").eq("profile_id", user.id).maybeSingle();
  if (!artist) redirect("/artist/onboarding");
  await admin
    .from("request_matches")
    .update({ status: "declined" })
    .eq("request_id", requestId)
    .eq("artist_id", artist.id)
    .in("status", ["notified", "viewed"]);
  revalidatePath("/artist/leads");
  revalidatePath(`/artist/leads/${requestId}`);
  redirect("/artist/leads");
}

/** Artist undoes passing on a lead - brings it back to their active leads. */
export async function unpassLead(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const requestId = String(formData.get("request_id") ?? "");
  if (!requestId) return;
  const admin = createAdminClient();
  const { data: artist } = await admin.from("artists").select("id").eq("profile_id", user.id).maybeSingle();
  if (!artist) redirect("/artist/onboarding");
  await admin
    .from("request_matches")
    .update({ status: "notified" })
    .eq("request_id", requestId)
    .eq("artist_id", artist.id)
    .eq("status", "declined");
  revalidatePath("/artist/leads");
  revalidatePath(`/artist/leads/${requestId}`);
  redirect(`/artist/leads/${requestId}`);
}
