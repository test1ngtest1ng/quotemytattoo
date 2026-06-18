import { createClient } from "@supabase/supabase-js";
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const { data, error } = await admin.auth.admin.listUsers({ perPage: 100 });
if (error) { console.error(error); process.exit(1); }
console.log("project:", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log("total users:", data.users.length);
for (const u of data.users) console.log(u.email, "|", u.user_metadata?.name ?? "", "|", u.email_confirmed_at ? "confirmed" : "UNCONFIRMED");
