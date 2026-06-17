import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Quality & safety standards",
  description: "How Quote My Tattoo helps you book safely - licensing, insurance, hygiene and the checks behind artist profiles.",
  alternates: { canonical: "/quality-standards" },
};

export default function QualityStandardsPage() {
  return (
    <article className="legal">
      <div className="crumb"><Link href="/">Home</Link> / Quality &amp; safety standards</div>
      <h1>Quality &amp; safety standards</h1>
      <p>
        A great tattoo starts with a safe, professional studio. Here&apos;s what we ask of artists on Quote My
        Tattoo and what to look for before you book.
      </p>

      <div className="note">
        We&apos;re building out automated verification. Today, credentials shown on profiles are self-declared
        by artists; always confirm licensing and hygiene with the studio before your appointment.
      </div>

      <h2>What artists can declare</h2>
      <ul>
        <li><strong>Licensed / council-registered</strong> - every UK tattoo studio must be registered with its local council.</li>
        <li><strong>Public liability insurance</strong> - cover for the artist&apos;s work.</li>
        <li><strong>Hygiene certified</strong> - trained in cross-contamination and sterilisation.</li>
        <li><strong>First-aid trained</strong>.</li>
      </ul>

      <h2>How to check your artist is legit</h2>
      <ul>
        <li>Ask for their council registration - you can verify it with the local council&apos;s environmental health team.</li>
        <li>Check the studio uses single-use needles and sterilised equipment.</li>
        <li>Read their reviews and look at healed work, not just fresh photos.</li>
        <li>Make sure you&apos;re given a consent form and a short medical questionnaire before starting.</li>
      </ul>

      <h2>Reviews you can trust</h2>
      <p>
        Reviews on Quote My Tattoo can only be left by customers who booked the artist through the platform.
        See our <Link href="/reviews-policy">reviews policy</Link>.
      </p>
    </article>
  );
}
