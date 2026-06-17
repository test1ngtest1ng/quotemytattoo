import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, messageEmail } from "@/lib/email/resend";

/**
 * Fire-and-forget endpoint the chat calls after a message is inserted. Emails the
 * OTHER participant that they have a new message. Debounced: if the recipient
 * already has unread messages from this sender, they've been notified - skip,
 * so an active back-and-forth doesn't spam their inbox.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  let body: { conversationId?: string; messageId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const { conversationId, messageId } = body;
  if (!conversationId || !messageId) return NextResponse.json({ ok: false }, { status: 400 });

  const admin = createAdminClient();

  const { data: msg } = await admin
    .from("messages")
    .select("id, conversation_id, sender_id, body, image_url")
    .eq("id", messageId)
    .maybeSingle();
  // Only the sender of this very message may trigger its notification.
  if (!msg || msg.conversation_id !== conversationId || msg.sender_id !== user.id) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const { data: convo } = await admin
    .from("conversations")
    .select("customer_id, artist_id, request_id, request:tattoo_requests(title)")
    .eq("id", conversationId)
    .maybeSingle();
  if (!convo) return NextResponse.json({ ok: false }, { status: 404 });

  // Debounce - already-unread from this sender means they were already emailed.
  const { count: pending } = await admin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .eq("sender_id", msg.sender_id)
    .is("read_at", null)
    .neq("id", messageId);
  if ((pending ?? 0) > 0) return NextResponse.json({ ok: true, skipped: "debounced" });

  const senderIsCustomer = msg.sender_id === convo.customer_id;

  const { data: customer } = await admin
    .from("profiles")
    .select("name, email, notification_settings")
    .eq("id", convo.customer_id)
    .maybeSingle();
  const { data: artist } = await admin
    .from("artists")
    .select("display_name, profile_id")
    .eq("id", convo.artist_id)
    .maybeSingle();
  const { data: artistProfile } = artist?.profile_id
    ? await admin
        .from("profiles")
        .select("name, email, notification_settings")
        .eq("id", artist.profile_id)
        .maybeSingle()
    : { data: null };

  const recipient = senderIsCustomer ? artistProfile : customer;
  const fromName = (senderIsCustomer ? customer?.name : artist?.display_name) ?? "Someone";
  const requestId = convo.request_id as string;
  const href = senderIsCustomer ? `/artist/leads/${requestId}` : `/requests/${requestId}`;

  if (!recipient?.email) return NextResponse.json({ ok: true, skipped: "no-email" });
  const settings = recipient.notification_settings as { messages_email?: boolean } | null;
  if (settings?.messages_email === false) return NextResponse.json({ ok: true, skipped: "opted-out" });

  const { subject, html } = messageEmail({
    recipientName: recipient.name ?? null,
    fromName,
    preview: msg.body?.trim() || null,
    hasImage: !!msg.image_url,
    href,
  });
  const sent = await sendEmail({ to: recipient.email, subject, html });
  return NextResponse.json({ ok: sent.ok, error: sent.error });
}
