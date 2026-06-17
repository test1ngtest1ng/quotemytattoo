import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Careers",
  description: "Help build the UK's most trusted way to find a tattoo artist. See open roles at Quote My Tattoo.",
  alternates: { canonical: "/careers" },
};

export default function CareersPage() {
  return (
    <article className="legal">
      <div className="crumb"><Link href="/">Home</Link> / Careers</div>
      <h1>Careers</h1>
      <p>
        We&apos;re a small team building the most trusted way to find and book a tattoo artist in the UK.
        We care about good design, fair marketplaces and the craft of tattooing.
      </p>
      <h2>Open roles</h2>
      <p>
        We don&apos;t have any open positions right now. We&apos;re growing, though - if you think you could
        help (engineering, design, partnerships or community), we&apos;d still love to hear from you.
      </p>
      <h2>Get in touch</h2>
      <p>Send a note and your portfolio/CV to <a href="mailto:careers@quotemytattoo.co.uk">careers@quotemytattoo.co.uk</a>.</p>
    </article>
  );
}
