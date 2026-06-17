"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveUser } from "@/lib/auth/user";
import { sendEmail } from "@/lib/email/resend";
import { createNotification } from "@/lib/notifications";
import { emailAllowed } from "@/lib/notification-prefs";

import { SITE_URL as SITE } from "@/lib/site";

function revalidateBoth(requestId: string) {
  revalidatePath(`/requests/${requestId}`);
  revalidatePath(`/artist/leads/${requestId}`);
}

/**
 * Share contact details on a request/artist conversation (a "connection" = the
 * recorded reveal/lead event). Mutual: either the customer or the matched artist
 * can initiate; both sides' contact becomes visible. Idempotent per (request, artist).
 */
export async function shareContact(formData: FormData) {
  const user = await requireActiveUser();

  const requestId = String(formData.get("request_id") ?? "");
  const artistId = String(formData.get("artist_id") ?? "");
  if (!requestId || !artistId) return;

  const admin = createAdminClient();
  const { data: req } = await admin
    .from("tattoo_requests")
    .select("customer_id, title, profiles!tattoo_requests_customer_id_fkey(name, email)")
    .eq("id", requestId)
    .maybeSingle();
  if (!req) redirect("/dashboard");
  const { data: art } = await admin
    .from("artists")
    .select("id, display_name, profile_id, profiles!artists_profile_id_fkey(email, notification_settings)")
    .eq("id", artistId)
    .maybeSingle();
  if (!art) redirect("/dashboard");

  const reqTitle = (req.title as string) ?? "your request";
  const customerName = (req.profiles as { name?: string } | null)?.name ?? "A customer";

  const isCustomer = req.customer_id === user.id;
  const isArtist = art.profile_id === user.id;
  if (!isCustomer && !isArtist) redirect("/dashboard");

  await admin.from("connections").upsert(
    {
      request_id: requestId,
      artist_id: artistId,
      initiated_by: isArtist ? "artist" : "customer",
      revealed_at: new Date().toISOString(),
    },
    { onConflict: "request_id,artist_id", ignoreDuplicates: true },
  );

  // Notify the artist when the customer accepts (in-app + email). They may be
  // comparing a few artists, so this is interest, not a guaranteed win.
  if (isCustomer) {
    await createNotification(admin, {
      userId: art.profile_id as string,
      type: "quote_accepted",
      title: `${customerName} accepted your quote`,
      body: reqTitle,
      href: `/artist/leads/${requestId}`,
      requestId,
    });
    const artProfile = art.profiles as { email?: string; notification_settings?: unknown } | null;
    const artEmail = artProfile?.email;
    if (artEmail && emailAllowed(artProfile?.notification_settings, "activity_email")) {
      await sendEmail({
        to: artEmail,
        subject: "A customer accepted your quote - Quote My Tattoo",
        html: `<div style="font-family:Figtree,Arial,sans-serif;color:#2a2233">
          <h2 style="color:#311a41">A customer accepted your quote</h2>
          <p>Their contact details are now shared with you. They may be comparing a few artists - get in touch to win the booking.</p>
          <p><a href="${SITE}/artist/leads/${requestId}" style="background:#6a2e96;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600">Open the lead</a></p>
        </div>`,
      });
    }
  }

  revalidateBoth(requestId);
}

/** Customer confirms the one artist they're going with (optional, late-bindable). */
export async function confirmBooked(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const requestId = String(formData.get("request_id") ?? "");
  const artistId = String(formData.get("artist_id") ?? "");
  const quoteId = String(formData.get("quote_id") ?? "") || null;
  if (!requestId || !artistId) return;

  const { error } = await supabase.rpc("confirm_booked", {
    p_request: requestId,
    p_artist: artistId,
    p_quote: quoteId,
  });
  if (error) redirect(`/requests/${requestId}?error=${encodeURIComponent(error.message)}`);

  // Notify the booked artist (in-app + email).
  const admin = createAdminClient();
  const [{ data: art }, { data: bookedReq }] = await Promise.all([
    admin.from("artists").select("display_name, profile_id, profiles!artists_profile_id_fkey(email)").eq("id", artistId).maybeSingle(),
    admin.from("tattoo_requests").select("title").eq("id", requestId).maybeSingle(),
  ]);
  if (art?.profile_id) {
    await createNotification(admin, {
      userId: art.profile_id as string,
      type: "booked",
      title: "You've been booked 🎉",
      body: (bookedReq?.title as string) ?? "A request",
      href: `/artist/leads/${requestId}`,
      requestId,
    });
  }
  const artEmail = (art?.profiles as { email?: string } | null)?.email;
  if (artEmail) {
    await sendEmail({
      to: artEmail,
      subject: "You've been booked - Quote My Tattoo",
      html: `<div style="font-family:Figtree,Arial,sans-serif;color:#2a2233">
        <h2 style="color:#311a41">You've been booked 🎉</h2>
        <p>A customer marked you as their chosen artist. Open the lead to arrange the details.</p>
        <p><a href="${SITE}/artist/leads/${requestId}" style="background:#6a2e96;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600">Open the lead</a></p>
      </div>`,
    });
  }

  revalidateBoth(requestId);
  redirect(`/requests/${requestId}?booked=1`);
}

/**
 * Customer cancels a quote acceptance - removes the connection so the artist's
 * contact stops showing and the lead drops back to "quoted". Not allowed for the
 * artist the customer has booked (they must reopen the request first). Note: the
 * artist may already have seen the contact details that were shared.
 */
export async function cancelAcceptance(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const requestId = String(formData.get("request_id") ?? "");
  const artistId = String(formData.get("artist_id") ?? "");
  if (!requestId || !artistId) return;

  const admin = createAdminClient();
  const { data: req } = await admin
    .from("tattoo_requests")
    .select("customer_id, booked_artist_id")
    .eq("id", requestId)
    .maybeSingle();
  if (!req || req.customer_id !== user.id) redirect("/dashboard");
  // The booked artist's acceptance can't be cancelled here - reopen the request first.
  if (req.booked_artist_id === artistId) {
    redirect(`/requests/${requestId}`);
  }

  await admin.from("connections").delete().eq("request_id", requestId).eq("artist_id", artistId);
  revalidateBoth(requestId);
  redirect(`/requests/${requestId}`);
}

/**
 * Single end-of-journey action from the request page. The customer is finishing
 * with the request and tells us the outcome via one `choice` field:
 *   - "book:<artistId>"  -> mark that (already-accepted) artist as booked + close
 *   - "elsewhere" / "changed_mind" -> close with that reason
 * This is the only place booking is captured, so there's no separate per-artist
 * "I booked them" control to overlap with closing.
 */
export async function finishRequest(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const requestId = String(formData.get("request_id") ?? "");
  const choice = String(formData.get("choice") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!requestId || !choice) return;

  // Booked one of the accepted artists.
  if (choice.startsWith("book:")) {
    const artistId = choice.slice("book:".length);
    if (!artistId) return;

    const { error } = await supabase.rpc("confirm_booked", {
      p_request: requestId,
      p_artist: artistId,
      p_quote: null,
    });
    if (error) redirect(`/requests/${requestId}?error=${encodeURIComponent(error.message)}`);
    // Record that the customer chose this themselves (drives banner wording).
    await supabase.from("tattoo_requests").update({ booked_by: "customer" }).eq("id", requestId);

    // Notify the booked artist.
    const admin = createAdminClient();
    const { data: art } = await admin
      .from("artists")
      .select("display_name, profiles!artists_profile_id_fkey(email)")
      .eq("id", artistId)
      .maybeSingle();
    const artEmail = (art?.profiles as { email?: string } | null)?.email;
    if (artEmail) {
      await sendEmail({
        to: artEmail,
        subject: "You've been booked - Quote My Tattoo",
        html: `<div style="font-family:Figtree,Arial,sans-serif;color:#2a2233">
          <h2 style="color:#311a41">You've been booked 🎉</h2>
          <p>A customer marked you as their chosen artist. Open the lead to arrange the details.</p>
          <p><a href="${SITE}/artist/leads/${requestId}" style="background:#6a2e96;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600">Open the lead</a></p>
        </div>`,
      });
    }

    revalidateBoth(requestId);
    redirect(`/requests/${requestId}?booked=1`);
  }

  // Closed without booking through us. RLS (request update is owner-only) protects this.
  await supabase
    .from("tattoo_requests")
    .update({ status: "closed", closed_reason: choice, closed_note: note })
    .eq("id", requestId);
  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/my-requests");
  redirect(`/requests/${requestId}?closed=1`);
}

/**
 * Artist marks a lead as booked (Phase 2). Allowed only when the customer has
 * already accepted this artist's quote (a connection exists) and the request is
 * still live - so an artist can't unilaterally claim a stranger's request. Closes
 * the request and notifies the customer, who can always reopen it.
 */
export async function artistMarkBooked(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const requestId = String(formData.get("request_id") ?? "");
  if (!requestId) return;

  const admin = createAdminClient();
  const { data: artist } = await admin
    .from("artists")
    .select("id, display_name, business_name")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!artist) redirect("/dashboard");

  const [{ data: conn }, { data: req }] = await Promise.all([
    admin.from("connections").select("id").eq("request_id", requestId).eq("artist_id", artist.id).maybeSingle(),
    admin.from("tattoo_requests").select("id, title, customer_id, status, booked_artist_id, profiles!tattoo_requests_customer_id_fkey(email)").eq("id", requestId).maybeSingle(),
  ]);
  // Need an accepted quote (connection) and a request that's still open.
  if (!conn || !req || req.status !== "live" || req.booked_artist_id) {
    redirect(`/artist/leads/${requestId}`);
  }

  await admin.from("tattoo_requests").update({ booked_artist_id: artist.id, status: "booked" }).eq("id", requestId);
  await admin.from("tattoo_requests").update({ booked_by: "artist" }).eq("id", requestId); // separate: tolerant if 0019 not yet run

  const label = (artist.business_name as string) || (artist.display_name as string) || "Your artist";
  const reqTitle = (req.title as string) ?? "Your request";
  // Notify the customer (in-app + email) - they can always reopen.
  await createNotification(admin, {
    userId: req.customer_id as string,
    type: "booked",
    title: `${label} marked your request as booked`,
    body: `${reqTitle} - reopen it if that's not right`,
    href: `/requests/${requestId}`,
    requestId,
  });
  const custEmail = (req.profiles as { email?: string } | null)?.email;
  if (custEmail) {
    await sendEmail({
      to: custEmail,
      subject: `${label} marked your request as booked - Quote My Tattoo`,
      html: `<div style="font-family:Figtree,Arial,sans-serif;color:#2a2233">
        <h2 style="color:#311a41">Your request is booked</h2>
        <p><strong>${label}</strong> marked your request "${reqTitle}" as booked, so we've closed it. If that's not right, you can reopen it any time.</p>
        <p><a href="${SITE}/requests/${requestId}" style="background:#6a2e96;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600">View the request</a></p>
      </div>`,
    });
  }

  revalidateBoth(requestId);
  redirect(`/artist/leads/${requestId}?booked=1`);
}

/** Artist undoes their own "mark as booked" (mis-click / fell through). */
export async function artistUnmarkBooked(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const requestId = String(formData.get("request_id") ?? "");
  if (!requestId) return;

  const admin = createAdminClient();
  const { data: artist } = await admin.from("artists").select("id").eq("profile_id", user.id).maybeSingle();
  if (!artist) redirect("/dashboard");

  // Only reverse a booking that this artist holds.
  await admin
    .from("tattoo_requests")
    .update({ booked_artist_id: null, status: "live" })
    .eq("id", requestId)
    .eq("booked_artist_id", artist.id);
  await admin.from("tattoo_requests").update({ booked_by: null }).eq("id", requestId);

  revalidateBoth(requestId);
  redirect(`/artist/leads/${requestId}`);
}

/** Customer un-marks the booked artist (changed their mind). Reviews persist. */
export async function unmarkBooked(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const requestId = String(formData.get("request_id") ?? "");
  if (!requestId) return;
  // RLS (request update is owner-only) protects this.
  await supabase.from("tattoo_requests").update({ booked_artist_id: null, status: "live" }).eq("id", requestId);
  await supabase.from("tattoo_requests").update({ booked_by: null }).eq("id", requestId);
  revalidateBoth(requestId);
  redirect(`/requests/${requestId}`);
}

/** Customer closes a request without booking through us (with a reason). */
export async function closeRequest(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const requestId = String(formData.get("request_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!requestId) return;
  await supabase
    .from("tattoo_requests")
    .update({ status: "closed", closed_reason: reason, closed_note: note })
    .eq("id", requestId);
  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/my-requests");
  redirect(`/requests/${requestId}?closed=1`);
}

/** Reopen a closed request. */
export async function reopenRequest(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const requestId = String(formData.get("request_id") ?? "");
  if (!requestId) return;
  await supabase
    .from("tattoo_requests")
    .update({ status: "live", closed_reason: null, closed_note: null })
    .eq("id", requestId);
  await supabase.from("tattoo_requests").update({ booked_by: null }).eq("id", requestId);
  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/my-requests");
  redirect(`/requests/${requestId}`);
}

/** Customer declines a quote - a quiet declutter of their own quote list. The
 *  artist is NOT notified/emailed (decline emails are demoralising + noisy);
 *  declined quotes are just moved out of the customer's active comparison.
 *  RLS quotes_update_customer (uid_owns_request) authorises the update. */
export async function declineQuote(formData: FormData) {
  await requireActiveUser();
  const requestId = String(formData.get("request_id") ?? "");
  const artistId = String(formData.get("artist_id") ?? "");
  if (!requestId || !artistId) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("quotes")
    .update({ status: "declined" })
    .eq("request_id", requestId)
    .eq("artist_id", artistId)
    .eq("status", "pending");
  if (error) redirect(`/requests/${requestId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/requests/${requestId}`);
  redirect(`/requests/${requestId}`);
}

/** Customer undoes a decline - brings the quote back to the active list. */
export async function undeclineQuote(formData: FormData) {
  await requireActiveUser();
  const requestId = String(formData.get("request_id") ?? "");
  const artistId = String(formData.get("artist_id") ?? "");
  if (!requestId || !artistId) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("quotes")
    .update({ status: "pending" })
    .eq("request_id", requestId)
    .eq("artist_id", artistId)
    .eq("status", "declined");
  if (error) redirect(`/requests/${requestId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/requests/${requestId}`);
  redirect(`/requests/${requestId}`);
}

/** Customer leaves a review (RLS requires they messaged this artist on this request). */
export async function leaveReview(formData: FormData) {
  const supabase = await createClient();
  const user = await requireActiveUser();

  const requestId = String(formData.get("request_id") ?? "");
  const artistId = String(formData.get("artist_id") ?? "");
  const rating = Math.max(1, Math.min(5, parseInt(String(formData.get("rating") ?? "5"), 10) || 5));
  const title = String(formData.get("title") ?? "").trim() || null;
  const body = String(formData.get("body") ?? "").trim() || null;

  const { data: row, error } = await supabase
    .from("reviews")
    .upsert(
      { request_id: requestId, artist_id: artistId, customer_id: user.id, rating, title, body },
      { onConflict: "request_id,customer_id,artist_id" },
    )
    .select("id")
    .single();
  if (error) redirect(`/requests/${requestId}?error=${encodeURIComponent(error.message)}`);

  // Optional healed-tattoo photos (uploaded client-side to review-images).
  // Written separately so it stays tolerant of a pre-0022 schema.
  const imageUrls = formData
    .getAll("image_url")
    .map((u) => String(u).trim())
    .filter(Boolean)
    .slice(0, 4);
  if (row?.id && imageUrls.length) {
    await supabase.from("reviews").update({ image_urls: imageUrls }).eq("id", row.id);
  }

  revalidatePath(`/requests/${requestId}`);
  redirect(`/requests/${requestId}?reviewed=1`);
}

/** Artist publicly replies to a review (only their own; sets artist_reply only). */
export async function artistReplyToReview(formData: FormData) {
  const user = await requireActiveUser();
  const reviewId = String(formData.get("review_id") ?? "");
  const reply = String(formData.get("reply") ?? "").trim() || null;
  if (!reviewId) return;

  const admin = createAdminClient();
  // Verify the review belongs to an artist owned by this user.
  const { data: rev } = await admin
    .from("reviews")
    .select("id, artist_id, request_id, artists!reviews_artist_id_fkey(profile_id)")
    .eq("id", reviewId)
    .maybeSingle();
  const ownerId = (rev?.artists as { profile_id?: string } | null)?.profile_id;
  if (!rev || ownerId !== user.id) redirect("/dashboard");

  await admin.from("reviews").update({ artist_reply: reply }).eq("id", reviewId);
  revalidatePath("/artist/profile");
  redirect("/artist/profile?replied=1");
}
