import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Help & support",
  description: "Help for customers and artists using Quote My Tattoo - posting requests, quotes, messaging, bookings and reviews.",
  alternates: { canonical: "/help" },
};

export default function HelpPage() {
  return (
    <article className="legal">
      <div className="crumb"><Link href="/">Home</Link> / Help &amp; support</div>
      <h1>Help &amp; support</h1>
      <p>Can&apos;t find what you need? Email <a href="mailto:help@quotemytattoo.co.uk">help@quotemytattoo.co.uk</a>.</p>

      <h2 id="customers">For customers</h2>
      <h3>How do I get quotes?</h3>
      <p><Link href="/new-request">Post your tattoo idea</Link> with a reference, placement, size and your area. Matched local artists send quotes and you can message them directly.</p>
      <h3>Is it free?</h3>
      <p>Yes - posting a request and receiving quotes is completely free for customers.</p>
      <h3>When do I get the artist&apos;s details?</h3>
      <p>To protect everyone, an artist&apos;s full address and contact details are shared once you book them. Before that you chat through the platform.</p>
      <h3>Managing your requests</h3>
      <p>From <Link href="/my-requests">My requests</Link> you can review quotes, save a request as a draft, re-post an expired one, or delete it.</p>

      <h2 id="artists">For artists &amp; studios</h2>
      <h3>How do I receive leads?</h3>
      <p>Create a free profile with your styles and location. We send you enquiries that match. <Link href="/for-artists">Join as an artist</Link>.</p>
      <h3>Pausing leads</h3>
      <p>Booked up? Toggle your availability off from your dashboard to stop new lead emails. Turn it back on any time.</p>
      <h3>Studios</h3>
      <p>Register your studio and invite your artists by email - each gets their own listing under your studio name.</p>
    </article>
  );
}
