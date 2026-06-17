import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";
import { CITIES } from "@/lib/cities";
import { getUser } from "@/lib/auth/user";

export const metadata: Metadata = {
  title: "Find Tattoo Artists by City",
  description:
    "Browse licensed tattoo artists across the UK by city. Upload your design and get free quotes from top-rated studios near you.",
  alternates: { canonical: "/tattoo-artists" },
};

export default async function CitiesIndex() {
  const user = await getUser();

  return (
    <>
      <div className="announce">
        Are you a tattoo artist looking for customers?{" "}
        <Link href="/signup?role=artist">Join for free</Link>
      </div>

      <header className="hdr">
        <div className="wrap">
          <Link className="logo" href="/">
            <span className="mk"><svg width="22" height="28" viewBox="0 0 100 130" aria-hidden="true"><path d="M50 6 C50 6 86 62 86 88 A36 36 0 1 1 14 88 C14 62 50 6 50 6 Z" /></svg></span>
            <span>quotemytattoo<i>.co.uk</i></span>
          </Link>
          <PublicNav links={[
            { href: "/artists", label: "Directory" },
            { href: "/new-request", label: "Request a quote" },
            { href: user ? "/dashboard" : "/login", label: user ? "Dashboard" : "Log in" },
            { href: "/signup?role=artist", label: "Sign up as an artist", cta: true },
          ]} />
        </div>
      </header>

      <section className="hero">
        <div className="wrap">
          <div className="crumb"><Link href="/">Home</Link><span>/</span>Cities</div>
          <h1>Find tattoo artists across the UK</h1>
          <p>Choose your city to see local, licensed tattoo artists, or upload your design and get free quotes from artists near you.</p>
          <div className="cta-row">
            <Link className="btn" href="/new-request">Request a Quote</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <h2>Browse tattoo artists by city</h2>
          <p className="lead">We&rsquo;re live in cities across the UK, with new artists joining every week.</p>
          <div className="area-grid">
            {CITIES.map((c) => (
              <Link key={c.slug} href={`/tattoo-artists/${c.slug}`}>{c.name}</Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="bigfoot">
        <div className="wrap">
          <Link className="flogo" href="/">
            <span className="mk"><svg width="22" height="28" viewBox="0 0 100 130" aria-hidden="true"><path d="M50 6 C50 6 86 62 86 88 A36 36 0 1 1 14 88 C14 62 50 6 50 6 Z" /></svg></span>
            <span>quotemytattoo<i>.co.uk</i></span>
          </Link>
          <div className="bf-bar">
            <span><Link href="/privacy">Privacy</Link><Link href="/cookies">Cookie Policy</Link><Link href="/terms">Terms and Conditions</Link></span>
            <span>© 2026 Quote My Tattoo Ltd</span>
          </div>
        </div>
      </footer>
    </>
  );
}
