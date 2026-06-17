import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Is the signed-in user an admin (profiles.is_admin)? */
export async function getIsAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  return !!data?.is_admin;
}

/** Gate an admin route/action - redirects non-admins to the dashboard. */
export async function requireAdmin() {
  if (!(await getIsAdmin())) redirect("/dashboard");
}
