"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { geocode } from "@/lib/geo";

import { SITE_URL as SITE } from "@/lib/site";

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function uniqueStudioSlug(base: string): Promise<string> {
  const admin = createAdminClient();
  const root = base || "studio";
  let slug = root;
  let n = 1;
  while (n < 50) {
    const { data } = await admin.from("studios").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    n++;
    slug = `${root}-${n}`;
  }
  return `${root}-${Math.floor(n)}`;
}

export async function createStudio(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/studio/onboarding");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/studio/onboarding?error=Enter your studio name");

  const ownerName = String(formData.get("owner_name") ?? "").trim();
  const alsoArtist = formData.get("also_artist") === "on";

  const slug = await uniqueStudioSlug(slugify(name));
  const area = String(formData.get("location_area") ?? "").trim() || null;
  const postcode = String(formData.get("location_postcode") ?? "").trim() || null;
  // Geocode for distance-based directory search (fails soft to null).
  const point = await geocode(postcode || area || "");
  const { error } = await supabase.from("studios").insert({
    owner_profile_id: user.id,
    name,
    slug,
    location_area: area,
    location_postcode: postcode,
    address_line: String(formData.get("address_line") ?? "").trim() || null,
    latitude: point?.lat ?? null,
    longitude: point?.lng ?? null,
    bio: String(formData.get("bio") ?? "").trim() || null,
  });
  if (error) throw new Error(`Could not create studio: ${error.message}`);

  // save the owner/manager's personal name
  if (ownerName) await supabase.from("profiles").update({ name: ownerName }).eq("id", user.id);

  // If the owner also takes bookings, send them to finish their artist
  // listing (which auto-links to this studio).
  redirect(alsoArtist ? "/artist/onboarding" : "/studio");
}

export async function inviteArtist(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: studio } = await supabase
    .from("studios")
    .select("id, name")
    .eq("owner_profile_id", user.id)
    .maybeSingle();
  if (!studio) redirect("/studio/onboarding");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return;

  const token = crypto.randomUUID();
  const { error } = await supabase
    .from("studio_invites")
    .insert({ studio_id: studio.id, email, token });
  if (error) throw new Error(`Could not create invite: ${error.message}`);

  const link = `${SITE}/studio/join/${token}`;
  await sendEmail({
    to: email,
    subject: `You're invited to join ${studio.name} on Quote My Tattoo`,
    html: `<div style="font-family:Figtree,Arial,sans-serif;color:#2a2233">
      <h2 style="color:#311a41">${studio.name} invited you</h2>
      <p>${studio.name} has invited you to join their studio on Quote My Tattoo.</p>
      <p><a href="${link}" style="background:#6a2e96;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600">Accept invitation</a></p>
      <p style="color:#736b7e;font-size:13px">If you don't have an account yet, you'll be able to create one first.</p>
    </div>`,
  });

  revalidatePath("/studio");
}

export async function acceptInvite(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/signup?role=artist&next=/studio/join/${token}`);

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("studio_invites")
    .select("id, studio_id, status")
    .eq("token", token)
    .maybeSingle();
  if (!invite || invite.status !== "pending") {
    redirect("/dashboard?invite=invalid");
  }

  // The user must have an artist profile to join a studio.
  const { data: artist } = await admin
    .from("artists")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!artist) redirect(`/artist/onboarding?next=/studio/join/${token}`);

  await admin.from("studio_members").upsert(
    { studio_id: invite.studio_id, artist_id: artist.id, role: "artist" },
    { onConflict: "studio_id,artist_id" },
  );
  await admin.from("artists").update({ studio_id: invite.studio_id }).eq("id", artist.id);
  await admin.from("studio_invites").update({ status: "accepted" }).eq("id", invite.id);

  redirect("/dashboard?joined=studio");
}
