import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About us",
  description: "Quote My Tattoo helps people find and book trusted, reviewed UK tattoo artists - and helps artists fill their books with the work they want.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <article className="legal">
      <div className="crumb"><Link href="/">Home</Link> / About us</div>
      <h1>About Quote My Tattoo</h1>
      <p>
        Quote My Tattoo is a UK marketplace that connects people who want a tattoo with trusted, reviewed
        artists and studios near them. Post your idea once, get matched with local artists by style and
        location, compare portfolios and reviews, and book the artist who feels right - all for free.
      </p>
      <h2>Why we built it</h2>
      <p>
        Finding the right tattoo artist usually means trawling Instagram, messaging ten studios and hoping
        for a reply. We wanted to make it simple and transparent: one request, real quotes, and a clear way
        to compare artists on the things that matter - their work, their reviews and their credentials.
      </p>
      <h2>For artists and studios</h2>
      <p>
        For artists, we&apos;re a steadier way to find the pieces you actually want to do, without chasing
        leads. Set up a free profile and receive enquiries matched to your styles and area.{" "}
        <Link href="/for-artists">Learn more about joining</Link>.
      </p>
      <h2>Get in touch</h2>
      <p>Questions, ideas or press enquiries: <a href="mailto:hello@quotemytattoo.co.uk">hello@quotemytattoo.co.uk</a>.</p>
    </article>
  );
}
