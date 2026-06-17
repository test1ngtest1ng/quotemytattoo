import crypto from "node:crypto";
import { SITE_URL } from "@/lib/site";

/** Stateless one-click email unsubscribe. A signed token encodes the user id +
 *  category so the unsubscribe link works without login and can't be forged.
 *  Signed with the service-role key (server-only, never exposed to the client).
 *  Server-only module - do not import from client components. */
const SECRET =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.CRON_SECRET ?? "dev-unsubscribe-secret";

function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function makeUnsubToken(userId: string, category: string): string {
  const payload = `${userId}:${category}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

export function parseUnsubToken(token: string): { userId: string; category: string } | null {
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return null;
  let payload: string;
  try {
    payload = Buffer.from(b64, "base64url").toString("utf8");
  } catch {
    return null;
  }
  // Constant-time compare to avoid leaking via timing.
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  const [userId, category] = payload.split(":");
  if (!userId || !category) return null;
  return { userId, category };
}

export function unsubUrl(userId: string, category: string): string {
  return `${SITE_URL}/api/unsubscribe?token=${makeUnsubToken(userId, category)}`;
}
