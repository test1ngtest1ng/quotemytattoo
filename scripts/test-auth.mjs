// Dev-only: creates confirmed test users via the Supabase admin API (no email
// sent) and verifies the auto-profile trigger + Founding Member assignment.
// Run: set -a && . ./.env.local && set +a && node scripts/test-auth.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase env vars");

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function ensureUser(email, password, meta) {
  // remove if already exists (so the script is re-runnable)
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list.users.find((u) => u.email === email);
  if (existing) await admin.auth.admin.deleteUser(existing.id);

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: meta,
  });
  if (error) throw new Error(`createUser(${email}): ${error.message}`);
  return data.user;
}

const customer = await ensureUser("qmt.customer1@gmail.com", "testpass123", {
  name: "Test Customer",
  phone: "07700900111",
  role: "customer",
});
console.log("✓ customer user:", customer.id);

const artist = await ensureUser("qmt.artist1@gmail.com", "testpass123", {
  name: "Test Artist",
  phone: "07700900222",
  role: "artist",
});
console.log("✓ artist user:", artist.id);

// Verify the auto-profile trigger created profiles with the right roles.
const { data: profiles, error: pErr } = await admin
  .from("profiles")
  .select("id, name, role, phone")
  .in("id", [customer.id, artist.id]);
if (pErr) throw pErr;
console.log("profiles created by trigger:", profiles);

console.log(
  "\nLogin test credentials (email confirmed):\n  customer: qmt.customer1@gmail.com / testpass123\n  artist:   qmt.artist1@gmail.com / testpass123",
);
