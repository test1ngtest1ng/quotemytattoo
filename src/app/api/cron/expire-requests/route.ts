import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Closes live requests that have passed their expires_at (6 weeks after posting).
 * Wired to a daily Vercel Cron (see vercel.json). Protected by CRON_SECRET so
 * only the scheduled job can run it.
 */
export async function GET(request: Request) {
  // Fail closed: refuse if CRON_SECRET is unset or the bearer token doesn't match,
  // so a misconfigured deploy can't leave this endpoint publicly triggerable.
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tattoo_requests")
    .update({ status: "closed" })
    .eq("status", "live")
    .lt("expires_at", new Date().toISOString())
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Purge abandoned guest drafts: a guest who created an account at submit but
  // never confirmed their email leaves a draft (publish_on_verify) + its uploaded
  // images. After 7 days, delete them (the flag self-clears on confirmation, so a
  // still-flagged draft means never confirmed). Remove the bucket images first,
  // then the rows (request_images cascade).
  let purged = 0;
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: stale } = await admin
    .from("tattoo_requests")
    .select("id, request_images(storage_path)")
    .eq("publish_on_verify", true)
    .eq("status", "draft")
    .lt("created_at", cutoff);
  if (stale && stale.length) {
    const paths = stale
      .flatMap((r) => (r.request_images as { storage_path: string }[] | null) ?? [])
      .map((i) => i.storage_path)
      .filter(Boolean);
    if (paths.length) await admin.storage.from("request-images").remove(paths);
    const ids = stale.map((r) => r.id as string);
    await admin.from("tattoo_requests").delete().in("id", ids);
    purged = ids.length;
  }

  return NextResponse.json({ closed: data?.length ?? 0, purged });
}
