// Dev-only: creates pre-confirmed test logins (no email needed) for walking the
// flows. Run: set -a && . ./.env.local && set +a && node scripts/seed-logins.mjs
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function reset(email, password, meta) {
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list.users.find((u) => u.email === email);
  if (existing) {
    // wipe any artist/studio rows so onboarding starts fresh
    await admin.from("studios").delete().eq("owner_profile_id", existing.id);
    await admin.from("artists").delete().eq("profile_id", existing.id);
    await admin.auth.admin.deleteUser(existing.id);
  }
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: meta,
  });
  if (error) throw new Error(`${email}: ${error.message}`);
  console.log(`✓ ${email}  (${meta.role})`);
}

await reset("qmt.artist2@gmail.com", "testpass123", { name: "Jordan Lee", role: "artist" });
await reset("qmt.studio1@gmail.com", "testpass123", { name: "Sam Carter", role: "studio_owner" });

console.log("\nTest logins (password: testpass123):");
console.log("  Customer:      qmt.customer1@gmail.com");
console.log("  Artist (NEW):  qmt.artist2@gmail.com   -> walk artist onboarding");
console.log("  Studio owner:  qmt.studio1@gmail.com   -> walk studio onboarding");
console.log("  Artist (done): qmt.artist1@gmail.com   -> completed profile (shows on /tattoo-artists/london)");
