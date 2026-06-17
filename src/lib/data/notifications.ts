"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { NOTIF_SEEN_COOKIE } from "@/lib/notifications";

/**
 * Opening the bell = acknowledged. Stamps "seen now" (clears the message side of
 * the badge, which counts messages newer than this, WITHOUT marking chat messages
 * read so receipts/unread lists stay accurate) and marks the user's notification
 * rows read (they're persisted as action surfaces on the dashboard/leads anyway).
 */
export async function markNotificationsSeen() {
  const store = await cookies();
  store.set(NOTIF_SEEN_COOKIE, String(Date.now()), {
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("read_at", null);
    }
  } catch {
    /* non-critical */
  }
}
