import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Reviews policy",
  description: "How reviews work on Quote My Tattoo - who can leave them and how we keep them genuine.",
  alternates: { canonical: "/reviews-policy" },
};

export default function ReviewsPolicyPage() {
  return (
    <article className="legal">
      <div className="crumb"><Link href="/">Home</Link> / Reviews policy</div>
      <h1>Reviews policy</h1>
      <p>Reviews only help if they&apos;re genuine. Here&apos;s how we keep them that way.</p>

      <h2>Who can leave a review</h2>
      <p>
        Only a customer who booked an artist through Quote My Tattoo can review that artist. This ties every
        review to a real booking, so you can trust what you read.
      </p>

      <h2>What we expect</h2>
      <ul>
        <li>Reviews must be honest and based on your own experience.</li>
        <li>No abusive, discriminatory, defamatory or off-topic content.</li>
        <li>No fake, incentivised or competitor reviews.</li>
      </ul>

      <h2>Moderation</h2>
      <p>
        We may remove reviews that breach this policy or our{" "}
        <Link href="/terms">Terms</Link>. If you believe a review is fake or abusive, contact{" "}
        <a href="mailto:help@quotemytattoo.co.uk">help@quotemytattoo.co.uk</a>.
      </p>
    </article>
  );
}
