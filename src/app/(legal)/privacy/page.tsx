import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Quote My Tattoo collects, uses and protects your personal data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <article className="legal">
      <div className="crumb"><Link href="/">Home</Link> / Privacy Policy</div>
      <h1>Privacy Policy</h1>
      <p className="updated">Last updated: 16 June 2026</p>

      <div className="note">
        This is a starter policy provided as a working template. Have it reviewed by a solicitor and
        confirm your registered company details and ICO registration before public launch.
      </div>

      <p>
        This Privacy Policy explains how Quote My Tattoo Ltd (&quot;we&quot;, &quot;us&quot;) collects and uses your
        personal data when you use quotemytattoo.co.uk (the &quot;Service&quot;). We are the data controller
        for the personal data described here. We comply with the UK GDPR and the Data Protection Act 2018.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details</strong> - your name, email address, phone number and password (passwords are stored in a hashed form by our authentication provider; we never see them).</li>
        <li><strong>Tattoo requests</strong> - the design references you upload, placement, size, your town/postcode and travel radius.</li>
        <li><strong>Artist/studio profiles</strong> - business and personal name, bio, styles, location and full address, portfolio images, social links and self-declared credentials.</li>
        <li><strong>Messages and quotes</strong> - the content you exchange with other users through the platform.</li>
        <li><strong>Technical data</strong> - essential cookies needed to keep you signed in, and basic logs.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To run the marketplace - matching customers with artists by style and location, and enabling quotes, messaging and bookings.</li>
        <li>To send service emails (for example, a new quote or message notification).</li>
        <li>To show public artist/studio profiles in search results.</li>
        <li>To keep the Service secure and prevent abuse.</li>
      </ul>

      <h2>Lawful bases</h2>
      <p>
        We process your data to perform our contract with you (providing the Service), for our legitimate
        interests (running and improving a safe marketplace), and with your consent where required
        (for example, optional marketing emails, which you can withdraw at any time).
      </p>

      <h2>What is shared, and when</h2>
      <p>
        Your public profile (artists/studios) shows your business name, town and the outward part of your
        postcode only. Your full street address and direct contact details are <strong>only</strong> revealed to
        the other party once a booking is made. Customers&apos; contact details are shared with an artist only
        after the customer books them.
      </p>

      <h2>Processors we use</h2>
      <ul>
        <li><strong>Supabase</strong> - database, authentication and file storage, hosted in the EU/UK region.</li>
        <li><strong>Resend</strong> - sending transactional emails.</li>
        <li><strong>Vercel</strong> - application hosting.</li>
        <li><strong>postcodes.io</strong> - UK postcode/town lookups (we do not send personal data; only the location text you type).</li>
      </ul>

      <h2>Data retention</h2>
      <p>
        We keep your account data while your account is active. You can delete your account at any time
        from your account settings, which removes your profile and associated data. Some records may be
        retained where we have a legal obligation to do so.
      </p>

      <h2>Your rights</h2>
      <p>
        You have the right to access, correct, delete or export your data, to object to or restrict
        processing, and to withdraw consent. To exercise these rights, contact us at the address below.
        You also have the right to complain to the Information Commissioner&apos;s Office (ico.org.uk).
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy or your data: <a href="mailto:privacy@quotemytattoo.co.uk">privacy@quotemytattoo.co.uk</a>.
      </p>

      <p>See also our <Link href="/cookies">Cookie Policy</Link> and <Link href="/terms">Terms and Conditions</Link>.</p>
    </article>
  );
}
