// Dev-only: gives the test artist a complete artist profile so matching has
// someone to match. Run: set -a && . ./.env.local && set +a && node scripts/seed-artist.mjs
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const { data: list } = await admin.auth.admin.listUsers();
const artistUser = list.users.find((u) => u.email === "qmt.artist1@gmail.com");
if (!artistUser) throw new Error("artist user not found - run test-auth.mjs first");

const { data, error } = await admin
  .from("artists")
  .upsert(
    {
      profile_id: artistUser.id,
      display_name: "Mara Whitlock",
      slug: "mara-whitlock",
      bio: "Fine line & botanical specialist based in St Albans.",
      primary_style: "Fine line",
      styles: ["Fine line", "Black & grey", "Botanical"],
      location_area: "St Albans",
      location_postcode: "AL1",
      insured: true,
      licensed: true,
      hygiene_certified: true,
      profile_complete: true,
    },
    { onConflict: "profile_id" },
  )
  .select("id, display_name, is_founding_member, founding_number, profile_complete")
  .single();

if (error) throw error;
console.log("✓ artist profile ready:", data);
