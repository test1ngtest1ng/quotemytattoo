import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const NOTIF_SEEN_COOKIE = "qmt-notif-seen";

export type FeedKind = "message" | "quote_accepted" | "booked" | "new_lead" | "new_quote" | "expiring";

/** A single row in the notification bell - either an unread chat thread or a
 *  discrete event from the notifications table. */
export type FeedItem = {
  id: string;
  kind: FeedKind;
  title: string; // context line (the request title)
  primary: string; // headline (the other person, or the event title)
  snippet: string; // supporting line
  href: string;
  at: string; // ISO timestamp used for sorting + "x ago"
  count?: number; // unread message count (messages only)
};

export type UnreadSummary = { count: number; items: FeedItem[] };

type ConvoRow = {
  id: string;
  request_id: string;
  customer_id: string;
  artist_id: string | null;
  request: { title: string | null } | null;
  customer: { name: string | null } | null;
  artist: { display_name: string | null } | null;
  messages:
    | { id: string; sender_id: string | null; read_at: string | null; body: string | null; image_url: string | null; created_at: string }[]
    | null;
};

/**
 * Insert an in-app notification (server-side, via an admin/service-role client).
 * Fails soft - a notification should never break the action that triggered it.
 */
export async function createNotification(
  admin: SupabaseClient,
  n: { userId: string; type: FeedKind; title: string; body?: string | null; href?: string | null; requestId?: string | null },
): Promise<void> {
  try {
    await admin.from("notifications").insert({
      user_id: n.userId,
      type: n.type,
      title: n.title,
      body: n.body ?? null,
      href: n.href ?? null,
      request_id: n.requestId ?? null,
    });
  } catch {
    /* non-critical */
  }
}

/**
 * The notification bell feed for the signed-in user: unread chat threads MERGED
 * with unread notification rows (accepted quotes, bookings, new leads).
 * `items` = the dropdown list. `count` (the red badge) = unread notifications +
 * messages that arrived AFTER the user last opened the bell (the `qmt-notif-seen`
 * cookie), so opening the bell clears the badge while the lists stay accurate.
 */
export async function getUnread(
  supabase: SupabaseClient,
  profileId: string,
  artistId: string | null,
): Promise<UnreadSummary> {
  const orParts = [`customer_id.eq.${profileId}`];
  if (artistId) orParts.push(`artist_id.eq.${artistId}`);

  const seenRaw = (await cookies()).get(NOTIF_SEEN_COOKIE)?.value;
  const seenMs = seenRaw ? parseInt(seenRaw, 10) : 0;

  const [{ data: convoData }, { data: notifData }] = await Promise.all([
    supabase
      .from("conversations")
      .select(
        "id, request_id, customer_id, artist_id, request:tattoo_requests(title), customer:profiles!conversations_customer_id_fkey(name), artist:artists!conversations_artist_id_fkey(display_name), messages(id, sender_id, read_at, body, image_url, created_at)",
      )
      .or(orParts.join(",")),
    supabase
      .from("notifications")
      .select("id, type, title, body, href, created_at")
      .eq("user_id", profileId)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  const items: FeedItem[] = [];
  let count = 0; // badge: unread newer than last-seen

  for (const c of (convoData as ConvoRow[] | null) ?? []) {
    const unread = (c.messages ?? []).filter((m) => m.read_at === null && m.sender_id !== profileId);
    if (unread.length === 0) continue;
    count += unread.filter((m) => new Date(m.created_at).getTime() > seenMs).length;
    unread.sort((a, b) => b.created_at.localeCompare(a.created_at));
    const last = unread[0];
    const iAmCustomer = c.customer_id === profileId;
    const otherName = (iAmCustomer ? c.artist?.display_name : c.customer?.name) ?? "Someone";
    const snippet = last.body?.trim() || (last.image_url ? "📷 Photo" : "New message");
    items.push({
      id: `m_${c.id}`,
      kind: "message",
      title: c.request?.title ?? "Tattoo request",
      primary: otherName,
      snippet: snippet.length > 80 ? snippet.slice(0, 80) + "…" : snippet,
      count: unread.length,
      href: iAmCustomer
        ? `/requests/${c.request_id}?artist=${c.artist_id}&tab=ms`
        : `/artist/leads/${c.request_id}#chat`,
      at: last.created_at,
    });
  }

  for (const n of (notifData as { id: string; type: FeedKind; title: string; body: string | null; href: string | null; created_at: string }[] | null) ?? []) {
    count += 1; // every unread notification counts toward the badge
    items.push({
      id: `n_${n.id}`,
      kind: n.type,
      title: n.body ?? "",
      primary: n.title,
      snippet: n.body ?? "",
      href: n.href ?? "/dashboard",
      at: n.created_at,
    });
  }

  items.sort((a, b) => b.at.localeCompare(a.at));
  return { count, items };
}
