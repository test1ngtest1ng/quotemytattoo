import { NextResponse } from "next/server";
import { getIsAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

type Row = Record<string, unknown>;

function toCsv(rows: Row[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => esc(r[h])).join(",")),
  ].join("\n");
}

const SOURCES: Record<string, { table: string; columns: string }> = {
  signups: { table: "profiles", columns: "created_at, name, email, role" },
  requests: {
    table: "tattoo_requests",
    columns: "created_at, title, style, size_category, placement_zone, location_area, status",
  },
  reports: { table: "reports", columns: "created_at, target_type, reason, details, status" },
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  if (!(await getIsAdmin())) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const { type } = await params;
  const admin = createAdminClient();

  // Connections need joins flattened, so handle them separately.
  if (type === "connections") {
    const { data } = await admin
      .from("connections")
      .select(
        "revealed_at, initiated_by, artist_id, request:tattoo_requests!connections_request_id_fkey(title, booked_artist_id, customer:profiles!tattoo_requests_customer_id_fkey(name)), artist:artists!connections_artist_id_fkey(display_name)",
      )
      .order("revealed_at", { ascending: false })
      .limit(5000);
    const flat = (data ?? []).map((b) => {
      const row = b as Record<string, unknown>;
      const req = (Array.isArray(row.request) ? row.request[0] : row.request) as
        | { title?: string | null; booked_artist_id?: string | null; customer?: { name?: string | null } | { name?: string | null }[] | null }
        | null;
      const cust = req ? (Array.isArray(req.customer) ? req.customer[0] : req.customer) : null;
      const art = (Array.isArray(row.artist) ? row.artist[0] : row.artist) as { display_name?: string | null } | null;
      return {
        revealed_at: row.revealed_at,
        request: req?.title ?? "",
        customer: cust?.name ?? "",
        artist: art?.display_name ?? "",
        initiated_by: row.initiated_by ?? "",
        booked: req?.booked_artist_id && req.booked_artist_id === row.artist_id ? "yes" : "no",
      };
    });
    return new NextResponse(toCsv(flat as Row[]), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="connections.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const source = SOURCES[type];
  if (!source) return new NextResponse("Unknown export", { status: 404 });

  const { data, error } = await admin
    .from(source.table)
    .select(source.columns)
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) return new NextResponse(error.message, { status: 500 });

  const csv = toCsv((data ?? []) as unknown as Row[]);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
