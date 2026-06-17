import "@/styles/account.css";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { CustomerAccount } from "@/components/account/CustomerAccount";

export const metadata: Metadata = {
  title: "Your Account",
  robots: { index: false, follow: false },
};

const SAVED_MSG: Record<string, string> = {
  contact: "Contact details saved.",
  notif: "Notification preferences saved.",
  password: "Password updated.",
  requests: "Tattoo-request details saved.",
  email: "We've sent a confirmation link to your new email address - click it to finish the change.",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; tab?: string; prompt?: string; emailchanged?: string }>;
}) {
  const { saved, error, tab, prompt, emailchanged } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email, phone, notification_settings")
    .eq("id", user.id)
    .single();

  // Self-heal: auth email is the source of truth. After a confirmed email
  // change, the denormalised profiles.email can lag - reconcile it here so
  // outgoing emails + display stay correct.
  if (user.email && profile && profile.email !== user.email) {
    await supabase.from("profiles").update({ email: user.email }).eq("id", user.id);
    profile.email = user.email;
  }

  // Request defaults read separately so a pre-migration column-missing error
  // can't blank out the rest of the account page.
  const { data: rd } = await supabase
    .from("profiles")
    .select("request_postcode, request_area, request_radius")
    .eq("id", user.id)
    .maybeSingle();

  // If they're an artist/studio, offer their work address as a one-tap default.
  const [{ data: artist }, { data: studio }] = await Promise.all([
    supabase
      .from("artists")
      .select("location_area, location_postcode")
      .eq("profile_id", user.id)
      .maybeSingle(),
    supabase
      .from("studios")
      .select("location_area, location_postcode")
      .eq("owner_profile_id", user.id)
      .maybeSingle(),
  ]);
  const work = studio ?? artist;
  const workAddress = work?.location_postcode || work?.location_area
    ? { area: work?.location_area ?? "", postcode: work?.location_postcode ?? "" }
    : null;

  const notice = error
    ? { type: "err" as const, text: error }
    : emailchanged === "1"
      ? { type: "ok" as const, text: "Your email address has been updated." }
      : saved
      ? { type: "ok" as const, text: SAVED_MSG[saved] ?? "Saved." }
      : prompt === "customer"
        ? { type: "ok" as const, text: "You're in customer mode - add your details below so artists can quote your own tattoos." }
        : undefined;

  return (
    <>
      <AppHeader />
      <main className="page">
        <div className="wrap">
          <h1 className="ptitle">Account &amp; Settings</h1>
          <CustomerAccount
            name={profile?.name ?? ""}
            email={profile?.email ?? user.email ?? ""}
            phone={profile?.phone ?? ""}
            settings={(profile?.notification_settings as Record<string, boolean>) ?? {}}
            isArtist={!!artist}
            requestDefaults={{
              postcode: rd?.request_postcode ?? "",
              area: rd?.request_area ?? "",
              radius: rd?.request_radius ?? 15,
            }}
            workAddress={workAddress}
            initialTab={(["requests", "contact", "notif", "manage"] as const).includes(tab as never) ? (tab as "requests" | "contact" | "notif" | "manage") : undefined}
            notice={notice}
          />
        </div>
      </main>
    </>
  );
}
