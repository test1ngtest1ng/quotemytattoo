import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { setSuspended, updateUserProfile, deleteAccount } from "@/lib/data/admin";

export const dynamic = "force-dynamic";

type Event = { when: string; label: string; detail?: string | null };

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

async function getActivity(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string,
  artistId: string | null,
): Promise<Event[]> {
  const none = Promise.resolve({ data: [] as Record<string, unknown>[] });
  const [reqs, quotes, custBk, artBk, revW, revR, msgs, reps] = await Promise.all([
    admin.from("tattoo_requests").select("title, created_at").eq("customer_id", profileId).order("created_at", { ascending: false }).limit(20),
    artistId ? admin.from("quotes").select("created_at, request:tattoo_requests!quotes_request_id_fkey(title)").eq("artist_id", artistId).order("created_at", { ascending: false }).limit(20) : none,
    admin.from("connections").select("revealed_at, request:tattoo_requests!inner(title, customer_id)").eq("request.customer_id", profileId).order("revealed_at", { ascending: false }).limit(20),
    artistId ? admin.from("connections").select("revealed_at, request:tattoo_requests!connections_request_id_fkey(title)").eq("artist_id", artistId).order("revealed_at", { ascending: false }).limit(20) : none,
    admin.from("reviews").select("created_at, rating, title").eq("customer_id", profileId).order("created_at", { ascending: false }).limit(20),
    artistId ? admin.from("reviews").select("created_at, rating, title").eq("artist_id", artistId).order("created_at", { ascending: false }).limit(20) : none,
    admin.from("messages").select("created_at, body").eq("sender_id", profileId).order("created_at", { ascending: false }).limit(15),
    admin.from("reports").select("created_at, target_type, reason").eq("reporter_id", profileId).order("created_at", { ascending: false }).limit(20),
  ]);

  const ev: Event[] = [];
  const title = (row: Record<string, unknown>) => {
    const r = row.request as { title?: string | null } | { title?: string | null }[] | null;
    const obj = Array.isArray(r) ? r[0] : r;
    return obj?.title ?? null;
  };
  (reqs.data ?? []).forEach((r) => ev.push({ when: r.created_at as string, label: "Posted a request", detail: r.title as string }));
  (quotes.data ?? []).forEach((q) => ev.push({ when: q.created_at as string, label: "Sent a quote", detail: title(q) }));
  (custBk.data ?? []).forEach((b) => ev.push({ when: b.revealed_at as string, label: "Shared contact with an artist", detail: title(b) }));
  (artBk.data ?? []).forEach((b) => ev.push({ when: b.revealed_at as string, label: "A customer shared contact", detail: title(b) }));
  (revW.data ?? []).forEach((r) => ev.push({ when: r.created_at as string, label: `Left a review (★${r.rating})`, detail: r.title as string }));
  (revR.data ?? []).forEach((r) => ev.push({ when: r.created_at as string, label: `Received a review (★${r.rating})`, detail: r.title as string }));
  (msgs.data ?? []).forEach((m) => ev.push({ when: m.created_at as string, label: "Sent a message", detail: ((m.body as string) ?? "").slice(0, 80) }));
  (reps.data ?? []).forEach((r) => ev.push({ when: r.created_at as string, label: "Filed a report", detail: `${r.target_type} · ${r.reason}` }));

  return ev.filter((e) => e.when).sort((a, b) => b.when.localeCompare(a.when)).slice(0, 40);
}

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const { saved, error } = await searchParams;
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, name, email, phone, role, postcode, suspended, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!profile) notFound();

  const { data: artist } = await admin
    .from("artists")
    .select("id, display_name, slug")
    .eq("profile_id", id)
    .maybeSingle();

  const events = await getActivity(admin, id, (artist?.id as string) ?? null);
  const suspended = !!profile.suspended;
  const roleLabel = String(profile.role ?? "").replace("_", " ");

  return (
    <>
      <div className="admin-head">
        <h2>{(profile.name as string) || (profile.email as string) || "User"}</h2>
        <Link href="/admin/users" className="btn-ghost-app">← All users</Link>
      </div>

      {saved && <p className="app-status" style={{ marginBottom: 16 }}>Changes saved.</p>}
      {error && <p className="app-card" style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#b91c1c", fontWeight: 700 }}>{error}</p>}

      <div className="app-card" style={{ marginBottom: 16 }}>
        <p style={{ margin: 0 }}>
          <span className="acct-pill" style={{ textTransform: "capitalize" }}>{roleLabel}</span>{" "}
          {suspended
            ? <span style={{ color: "#b91c1c", fontWeight: 800 }}>· Suspended</span>
            : <span style={{ color: "var(--trust)", fontWeight: 800 }}>· Active</span>}
        </p>
        <p className="app-sub" style={{ margin: "10px 0 0" }}>
          Joined {fmtDateTime(profile.created_at as string)}
          {artist?.slug ? <> · <Link href={`/artists/${artist.slug}`} style={{ color: "var(--violet)" }}>public profile ↗</Link></> : null}
        </p>
      </div>

      {/* Edit profile */}
      <div className="app-card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 18 }}>Edit Profile</h3>
        <form action={updateUserProfile}>
          <input type="hidden" name="user_id" value={id} />
          <div className="field">
            <label>Name</label>
            <input name="name" defaultValue={(profile.name as string) ?? ""} />
          </div>
          <div className="field">
            <label>Email</label>
            <input name="email" type="email" defaultValue={(profile.email as string) ?? ""} />
          </div>
          <div className="field">
            <label>Phone</label>
            <input name="phone" defaultValue={(profile.phone as string) ?? ""} />
          </div>
          <button className="btn" type="submit">Save Changes</button>
        </form>
      </div>

      {/* Status */}
      <div className="app-card" style={{ marginBottom: 16 }}>
        <h3>Account Status</h3>
        <p className="app-sub" style={{ margin: "8px 0 0" }}>
          {suspended
            ? "This account is suspended - they can't log in. Restore to give access back."
            : "Suspending blocks login and actions. It's fully reversible."}
        </p>
        <form action={setSuspended} className="app-actions">
          <input type="hidden" name="user_id" value={id} />
          <input type="hidden" name="suspended" value={suspended ? "0" : "1"} />
          {suspended ? (
            <button className="btn" type="submit">Restore Access</button>
          ) : (
            <button className="btn" type="submit" style={{ background: "#b91c1c" }}>Suspend Account</button>
          )}
        </form>
      </div>

      {/* Activity */}
      <div className="app-card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 6 }}>Recent Activity</h3>
        {events.length === 0 ? (
          <p className="app-sub" style={{ margin: "8px 0 0" }}>No recorded activity yet.</p>
        ) : (
          <div>
            {events.map((e, i) => (
              <div key={i} style={{ padding: "12px 0", borderTop: i === 0 ? "none" : "1px solid var(--line2)" }}>
                <div style={{ fontWeight: 700, color: "var(--ink)" }}>
                  {e.label}{e.detail ? <span style={{ color: "var(--muted)", fontWeight: 500 }}> - {e.detail}</span> : null}
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{fmtDateTime(e.when)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="app-card" style={{ borderColor: "#fecaca" }}>
        <h3 style={{ color: "#b91c1c" }}>Danger Zone</h3>
        <p className="app-sub" style={{ margin: "8px 0 16px" }}>
          Permanently delete this account and all its data. This cannot be undone. To confirm, type the
          account&apos;s email <strong>{profile.email as string}</strong> below. Prefer <em>Suspend</em> unless deletion is truly required.
        </p>
        <form action={deleteAccount}>
          <input type="hidden" name="user_id" value={id} />
          <div className="field" style={{ maxWidth: 380 }}>
            <input name="confirm_email" placeholder="Type the email to confirm" autoComplete="off" />
          </div>
          <button className="btn" type="submit" style={{ background: "#7f1d1d" }}>Delete Permanently</button>
        </form>
      </div>
    </>
  );
}
