import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "How and why Quote My Tattoo uses cookies.",
  alternates: { canonical: "/cookies" },
};

export default function CookiePolicyPage() {
  return (
    <article className="legal">
      <div className="crumb"><Link href="/">Home</Link> / Cookie Policy</div>
      <h1>Cookie Policy</h1>
      <p className="updated">Last updated: 16 June 2026</p>

      <div className="note">
        This is a starter policy provided as a working template. Update the table whenever you add new
        cookies or third-party scripts (for example analytics), and have it reviewed before launch.
      </div>

      <p>
        Cookies are small files stored on your device. We use them to keep the Service working and secure.
        We only set non-essential cookies with your consent.
      </p>

      <h2>Cookies we use</h2>
      <table>
        <thead>
          <tr><th>Cookie</th><th>Purpose</th><th>Type</th></tr>
        </thead>
        <tbody>
          <tr><td>Supabase auth tokens</td><td>Keep you signed in securely</td><td>Essential</td></tr>
          <tr><td>qmt-cookie-consent</td><td>Remembers your cookie choice</td><td>Essential</td></tr>
        </tbody>
      </table>

      <p>
        We currently do not use advertising or third-party tracking cookies. If we add analytics in future,
        we will update this policy and ask for your consent first.
      </p>

      <h2>Managing cookies</h2>
      <p>
        Essential cookies are required for the Service to function and cannot be switched off. You can clear
        or block cookies in your browser settings, but parts of the Service (such as staying signed in) may
        not work as a result.
      </p>

      <p>See also our <Link href="/privacy">Privacy Policy</Link> and <Link href="/terms">Terms and Conditions</Link>.</p>
    </article>
  );
}
