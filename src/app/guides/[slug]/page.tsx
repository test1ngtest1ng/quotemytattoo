import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIDES, getGuide } from "@/lib/guides";

import { SITE_URL as SITE } from "@/lib/site";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) return {};
  return {
    title: g.title,
    description: g.excerpt,
    alternates: { canonical: `/guides/${slug}` },
    openGraph: { title: g.title, description: g.excerpt, url: `${SITE}/guides/${slug}`, type: "article" },
  };
}

export default async function GuideArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) notFound();

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: g.title,
    description: g.excerpt,
    datePublished: "2026-06-16",
    dateModified: "2026-06-16",
    author: { "@type": "Organization", name: "Quote My Tattoo" },
    publisher: { "@type": "Organization", name: "Quote My Tattoo" },
    mainEntityOfPage: `${SITE}/guides/${g.slug}`,
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: g.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE}/guides` },
      { "@type": "ListItem", position: 3, name: g.title, item: `${SITE}/guides/${g.slug}` },
    ],
  };

  return (
    <article className="gart">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <div className="crumb" style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 14 }}>
        <Link href="/" style={{ color: "var(--muted)", textDecoration: "none" }}>Home</Link> /{" "}
        <Link href="/guides" style={{ color: "var(--muted)", textDecoration: "none" }}>Guides</Link> / {g.title}
      </div>

      <p className="gc-cat">{g.category}</p>
      <h1>{g.title}</h1>
      <p className="meta">Updated {g.updated} · {g.readTime}</p>

      <div className="hero-ph">Image: {g.imageAlt}</div>

      <p className="intro">{g.intro}</p>

      {g.sections.map((s, i) => (
        <section key={i}>
          <h2>{s.h2}</h2>
          {s.body.map((p, k) => <p key={k}>{p}</p>)}
          {s.list && <ul>{s.list.map((li, k) => <li key={k}>{li}</li>)}</ul>}
        </section>
      ))}

      <section className="faq">
        <h2>Frequently asked questions</h2>
        {g.faqs.map((f, i) => (
          <div key={i}>
            <h3>{f.q}</h3>
            <p>{f.a}</p>
          </div>
        ))}
      </section>

      <div className="cta">
        <h3>Ready to get started?</h3>
        <Link className="btn" href="/new-request">Get Free Quotes from Local Artists</Link>
      </div>

      <p style={{ marginTop: 28 }}>
        <Link href="/guides" style={{ color: "var(--violet)", fontWeight: 700, textDecoration: "none" }}>← All guides</Link>
      </p>
    </article>
  );
}
