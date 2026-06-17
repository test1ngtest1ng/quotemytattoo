import type { Metadata } from "next";
import Link from "next/link";
import { GUIDES } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Tattoo guides - pricing, aftercare, safety & styles",
  description:
    "Practical tattoo guides: how much tattoos cost, aftercare and healing, checking your artist is licensed, consent forms, choosing an artist and tattoo styles explained.",
  alternates: { canonical: "/guides" },
};

/* Image placeholder until a real /images/guides/{slug}.jpg is added. */
import { SITE_URL as SITE } from "@/lib/site";

export default function GuidesHubPage() {
  const categories = [...new Set(GUIDES.map((g) => g.category))];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Tattoo guides",
    url: `${SITE}/guides`,
    hasPart: GUIDES.map((g) => ({ "@type": "Article", headline: g.title, url: `${SITE}/guides/${g.slug}` })),
  };

  return (
    <div className="ghub">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="crumb" style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 14 }}>
        <Link href="/" style={{ color: "var(--muted)", textDecoration: "none" }}>Home</Link> / Guides
      </div>
      <h1>Tattoo guides</h1>
      <p className="lead">
        Everything to know before, during and after your tattoo - from pricing and styles to aftercare and
        how to check your artist is licensed.
      </p>

      {categories.map((cat) => (
        <section key={cat}>
          <h2 className="gcat">{cat}</h2>
          <div className="ggrid">
            {GUIDES.filter((g) => g.category === cat).map((g) => (
              <Link key={g.slug} className="gcard" href={`/guides/${g.slug}`}>
                <div className="ph">Image: {g.imageAlt}</div>
                <div className="gc-body">
                  <span className="gc-cat">{g.category}</span>
                  <h3>{g.title}</h3>
                  <p>{g.excerpt}</p>
                  <span className="gc-read">{g.readTime}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
