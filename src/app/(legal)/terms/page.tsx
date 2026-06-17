import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description: "The terms governing your use of the Quote My Tattoo marketplace.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <article className="legal">
      <div className="crumb"><Link href="/">Home</Link> / Terms and Conditions</div>
      <h1>Terms and Conditions</h1>
      <p className="updated">Last updated: 16 June 2026</p>

      <div className="note">
        This is a starter agreement provided as a working template. Have it reviewed by a solicitor and
        insert your registered company details before public launch.
      </div>

      <p>
        These Terms govern your use of quotemytattoo.co.uk (the &quot;Service&quot;), operated by
        Quote My Tattoo Ltd. By creating an account or using the Service you agree to these Terms.
      </p>

      <h2>1. What we do</h2>
      <p>
        Quote My Tattoo is a marketplace that connects customers looking for tattoos with tattoo artists
        and studios. We provide the platform for posting requests, receiving quotes, messaging and arranging
        bookings. <strong>We are not a party to any agreement between a customer and an artist</strong> and we do
        not provide tattooing services ourselves.
      </p>
      <p>
        When a customer or an artist chooses to show or share contact details on a request, <strong>both parties
        become able to see each other&apos;s contact details</strong> (such as phone, email and studio address) so they
        can arrange the work between themselves. Only share what you&apos;re comfortable sharing.
      </p>

      <h2>2. Eligibility &amp; accounts</h2>
      <ul>
        <li>You must be 18 or over to use the Service.</li>
        <li>You are responsible for keeping your login details secure and for activity on your account.</li>
        <li>You agree to provide accurate information and keep it up to date.</li>
      </ul>

      <h2>3. Pricing &amp; membership</h2>
      <p>
        The Service is currently <strong>free</strong> for customers, artists and studios during launch. Any prices
        shown for future memberships are current planned pricing for transparency and may change before any
        paid memberships are introduced. Founding Member benefits, where offered, are described on the
        relevant pages and we reserve the right to amend the programme.
      </p>

      <h2>4. Customer responsibilities</h2>
      <ul>
        <li>Provide honest information about the tattoo you want.</li>
        <li>Agree pricing, design and appointment details directly with your chosen artist.</li>
        <li>Treat artists professionally and attend agreed appointments.</li>
      </ul>

      <h2>5. Artist &amp; studio responsibilities</h2>
      <ul>
        <li>Hold all licences, registrations and insurance required to operate legally in your area.</li>
        <li>Ensure any credentials you declare on your profile are true and current.</li>
        <li>Respond to enquiries professionally and honour quotes and appointments you agree.</li>
        <li>Comply with all health, hygiene and consent requirements for tattooing.</li>
      </ul>

      <h2>6. Reviews</h2>
      <p>
        Reviews may only be left by customers who have booked an artist through the Service, and must be
        honest and based on genuine experience. We may remove reviews that are fake, abusive, defamatory or
        that breach these Terms.
      </p>

      <h2>7. Acceptable use</h2>
      <p>
        You must not misuse the Service, including by posting unlawful content, harassing other users,
        attempting to take transactions off-platform to avoid fees, scraping data, or interfering with the
        Service&apos;s operation.
      </p>

      <h2>8. Liability</h2>
      <p>
        The Service is provided &quot;as is&quot;. To the extent permitted by law, we are not liable for the acts,
        omissions, work quality or conduct of any customer, artist or studio, or for any agreement made
        between them. Nothing in these Terms limits liability that cannot be limited by law.
      </p>

      <h2>9. Changes &amp; termination</h2>
      <p>
        We may update these Terms or the Service from time to time. We may suspend or close accounts that
        breach these Terms. You can close your account at any time from your settings.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about these Terms: <a href="mailto:hello@quotemytattoo.co.uk">hello@quotemytattoo.co.uk</a>.
      </p>

      <p>See also our <Link href="/privacy">Privacy Policy</Link> and <Link href="/cookies">Cookie Policy</Link>.</p>
    </article>
  );
}
