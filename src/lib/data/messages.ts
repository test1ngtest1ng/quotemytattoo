import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Mark every message in these conversations that the reader didn't send as read.
 * Runs via the admin client because RLS lets a participant read but not update
 * the other person's rows. Callers MUST have already verified the reader owns
 * these conversations. Fails soft.
 */
export async function markConversationsRead(conversationIds: string[], readerId: string): Promise<void> {
  const ids = conversationIds.filter(Boolean);
  if (ids.length === 0) return;
  try {
    const admin = createAdminClient();
    await admin
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("conversation_id", ids)
      .neq("sender_id", readerId)
      .is("read_at", null);
  } catch {
    /* non-critical */
  }
}
