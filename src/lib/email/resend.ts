// Thin wrapper around the Resend REST API (no SDK dependency needed).
// Sends transactional email; fails soft (returns ok:false) so callers never
// break the main flow if email delivery fails (e.g. unverified domain in dev).
import { SITE_URL } from "@/lib/site";

const FROM = process.env.EMAIL_FROM ?? "Quote My Tattoo <onboarding@resend.dev>";

export async function sendEmail({
  to,
  subject,
  html,
  headers,
}: {
  to: string | string[];
  subject: string;
  html: string;
  /** Extra email headers, e.g. List-Unsubscribe for marketing-style mail. */
  headers?: Record<string, string>;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY not set" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to, subject, html, ...(headers ? { headers } : {}) }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Resend ${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}

export function messageEmail(opts: {
  recipientName: string | null;
  fromName: string;
  preview: string | null;
  hasImage: boolean;
  href: string;
}): { subject: string; html: string } {
  const hi = opts.recipientName ? `${opts.recipientName}, ` : "";
  const snippet = opts.preview
    ? `<p style="background:#f5f1f8;border-radius:10px;padding:14px 16px;color:#2a2233">${escapeHtml(
        opts.preview,
      )}</p>`
    : opts.hasImage
    ? `<p style="color:#736b7e">📷 Sent you an image.</p>`
    : "";
  return {
    subject: `New message from ${opts.fromName} - Quote My Tattoo`,
    html: `
      <div style="font-family:Figtree,Arial,sans-serif;color:#2a2233">
        <h2 style="color:#311a41">${hi}you have a new message</h2>
        <p><strong>${escapeHtml(opts.fromName)}</strong> replied about your tattoo request.</p>
        ${snippet}
        <p><a href="${SITE_URL}${opts.href}" style="background:#6a2e96;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600">Read &amp; reply</a></p>
        <p style="color:#736b7e;font-size:13px">You're receiving this because you have an open conversation on Quote My Tattoo.</p>
      </div>`,
  };
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function leadEmail(opts: {
  artistName: string;
  area: string | null;
  size: string | null;
  placement: string | null;
}): { subject: string; html: string } {
  const where = opts.area ? ` in ${opts.area}` : "";
  return {
    subject: `New tattoo lead${where} - Quote My Tattoo`,
    html: `
      <div style="font-family:Figtree,Arial,sans-serif;color:#2a2233">
        <h2 style="color:#311a41">You've got a new lead, ${escapeHtml(opts.artistName)}</h2>
        <p>A customer${where} is looking for a tattoo artist.</p>
        <ul>
          ${opts.size ? `<li><strong>Size:</strong> ${opts.size}</li>` : ""}
          ${opts.placement ? `<li><strong>Placement:</strong> ${opts.placement}</li>` : ""}
          ${opts.area ? `<li><strong>Area:</strong> ${opts.area}</li>` : ""}
        </ul>
        <p><a href="${SITE_URL}/artist/leads" style="background:#6a2e96;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600">View the lead</a></p>
        <p style="color:#736b7e;font-size:13px">You're receiving this because your styles/area matched this request.</p>
      </div>`,
  };
}
