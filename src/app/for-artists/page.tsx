/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { getUser } from "@/lib/auth/user";
import { MarketingMobileNav } from "@/components/marketing/MarketingMobileNav";
import { PRICING, foundingMonthly } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "For Artists - Get tattoo work the reliable way",
  description:
    "Join Quote My Tattoo free during launch. Receive tattoo enquiries that match your style and studio, build your reputation, and lock in Founding Member benefits.",
  alternates: { canonical: "/for-artists" },
};

const Chev = () => (
  <span className="qc-chev"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg></span>
);
const Answers = ({ n }: { n: string }) => (
  <div className="qc-foot"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z" strokeLinejoin="round" /></svg> {n}</div>
);

const STYLES = ["Fine line","Japanese","Realism","Traditional","Blackwork","Neo-traditional","Lettering","Geometric","Dotwork","Watercolour","Cover-ups","More +"];
const CITIES = ["London","Manchester","Birmingham","Leeds","Glasgow","Bristol","Liverpool","Edinburgh","Cardiff","Sheffield","Brighton"];

export default async function ForArtistsPage() {
  const user = await getUser();

  return (
    <>
      <header className="hdr"><div className="wrap">
        <Link className="logo" href="/"><span className="mk"><svg width="22" height="28" viewBox="0 0 100 130"><path d="M50 6 C50 6 86 62 86 88 A36 36 0 1 1 14 88 C14 62 50 6 50 6 Z" /></svg></span><span>quotemytattoo<i>.co.uk</i></span></Link>
        <nav className="nav">
          <Link className="login" href={user ? "/dashboard" : "/login"}>{user ? "Dashboard" : "Log In"}</Link>
          <Link className="cust" href="/">I Am a Customer</Link>
          <MarketingMobileNav
            links={[
              { href: user ? "/dashboard" : "/login", label: user ? "Dashboard" : "Log in" },
              { href: "/", label: "I am a customer" },
            ]}
          />
        </nav>
      </div></header>

      {/* HERO */}
      <section className="hero">
        <div className="band" />
        <div className="wrap"><div className="grid">
          <div>
            <h1>The reliable way to get the tattoo work you want</h1>
            <div className="signup" id="sign">
              <h3>View local tattoo enquiries</h3>
              <p style={{ margin: "0 0 14px", color: "var(--muted)", fontWeight: 600 }}>
                Free during launch. Set up your profile and start receiving enquiries that match your style and studio.
              </p>
              <ul style={{ margin: "0 0 18px", paddingLeft: 18, color: "var(--text)", lineHeight: 1.9 }}>
                <li>Free to join, no card, no commitment</li>
                <li>Founding Member status for early artists</li>
                <li>Only get enquiries that match your styles</li>
              </ul>
              <Link className="btn btn-block" href="/signup?role=artist">Sign Up for Free</Link>
              <p className="terms">By signing up you agree to our <Link href="/terms">Terms</Link>. See our <Link href="/privacy">Privacy policy</Link> for how we handle your data.</p>
            </div>
          </div>
          <div className="hero-photo">
            <img src="/images/artist-1.jpg" alt="A tattoo artist working on a client in a studio" />
            <span className="htag"><svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 2l3 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.4 21.7l1.8-7.3L1.5 9.5 9 8.9z" /></svg> Mara · 5/5</span>
            <span className="hbox" />
          </div>
        </div></div>
      </section>

      {/* ARTIST VS STUDIO */}
      <section className="section"><div className="wrap">
        <h2>Artist or studio - which should you join as?</h2>
        <p className="deck">Quote My Tattoo works for solo artists and for studios with a team. Pick the one that fits how you work.</p>
        <div className="compare">
          <div className="cmp-card">
            <span className="kick">Individual artist</span>
            <h3>Join as an artist</h3>
            <p className="for">For a self-employed, resident or guest artist who takes their own bookings.</p>
            <ul>
              <li>Your own profile with portfolio, styles and reviews</li>
              <li>Enquiries matched to your styles and area</li>
              <li>Chat and book customers directly</li>
              <li>Set your studio location and travel areas</li>
              <li>Link to your studio if you already work in one</li>
            </ul>
            <div className="cmp-price">Free during launch · planned <b>£{foundingMonthly(PRICING.artistMonthly)}/mo</b> Founding Member (from £{PRICING.artistMonthly})</div>
            <Link className="btn" href="/signup?role=artist">Sign Up as an Artist</Link>
          </div>
          <div className="cmp-card studio">
            <span className="kick">Studio</span>
            <h3>Register your studio</h3>
            <p className="for">For a studio or shop owner managing more than one artist under one roof.</p>
            <ul>
              <li>A studio profile for your shop</li>
              <li>Invite your artists by email to join under the studio</li>
              <li>Each artist gets their own listing and matched enquiries</li>
              <li>Your artists appear under your studio name</li>
              <li>One Founding Member status for the whole studio</li>
            </ul>
            <div className="cmp-price">Free during launch · planned <b>£{foundingMonthly(PRICING.studioMonthly)}/mo</b> Founding Member (from £{PRICING.studioMonthly})</div>
            <Link className="btn" href="/signup?role=studio">Register Your Studio</Link>
          </div>
        </div>
        <p className="cmp-note">
          Work in a studio but take your own bookings? <Link href="/signup?role=artist">Sign up as an artist</Link> and link to your studio - or ask the owner to invite you.
        </p>
      </div></section>

      {/* HOW IT WORKS */}
      <section className="section alt"><div className="wrap">
        <h2>How to get the work you want</h2>
        <p className="deck">Set up a free profile and start receiving tattoo enquiries that match your style and studio.</p>
        <div className="steps">
          <div className="step"><div className="illo"><img className="illo-img" src="/images/astep-1.svg" alt="" width={200} height={200} /></div><div className="sn">STEP 1</div><h3>Receive tailored enquiries</h3><p>Set up your free artist profile and we will send you enquiries that match your styles and studio location.</p></div>
          <div className="step"><div className="illo"><img className="illo-img" src="/images/astep-2.svg" alt="" width={200} height={200} /></div><div className="sn">STEP 2</div><h3>Express interest</h3><p>Respond to as many enquiries as you like. Based on your profile, portfolio and reviews, customers choose who to message.</p></div>
          <div className="step"><div className="illo"><img className="illo-img" src="/images/astep-3.svg" alt="" width={200} height={200} /></div><div className="sn">STEP 3</div><h3>Connect and book</h3><p>When a customer messages you, arrange the booking directly. It is free during launch, with no per-lead fees.</p></div>
        </div>
        <div className="center-cta"><Link className="btn" href="/signup?role=artist">Sign Up for Free</Link></div>
      </div></section>

      {/* DEVICE + FEATURES */}
      <section className="section"><div className="wrap">
        <h2>Ready to get tattoo work the reliable way?</h2>
        <p className="deck">There is no shortage of people wanting tattoos, but finding the pieces you actually want to do is not always easy. Quote My Tattoo sends you enquiries that are right for you.</p>
        <div className="device">
          <div className="laptop"><div className="screen">
            <div className="lp-bar"><i /><i /><i /><span className="lp-t">quotemytattoo.co.uk</span></div>
            <div className="lp-body"><h4>New enquiries</h4>
              <div className="erow"><span className="estyle">Fine line botanical</span><span className="emeta">Shoreditch · 1 hr ago</span><span className="etag">New</span></div>
              <div className="erow"><span className="estyle">Japanese half sleeve</span><span className="emeta">Camden · 3 hrs ago</span><span className="etag">New</span></div>
              <div className="erow"><span className="estyle">Black &amp; grey realism</span><span className="emeta">Hackney · 5 hrs ago</span><span className="etag" /></div>
              <div className="erow"><span className="estyle">Lettering, collarbone</span><span className="emeta">Soho · 1 day ago</span><span className="etag" /></div>
              <div className="erow"><span className="estyle">Geometric, forearm</span><span className="emeta">Islington · 1 day ago</span><span className="etag" /></div>
            </div>
          </div></div>
        </div>
        <div className="laptop-base" />
        <div className="feats" style={{ marginTop: 50 }}>
          <div className="feat"><h3>All the work you need</h3><ul><li>New enquiries posted every week</li><li>Whatever your style, only get enquiries that match</li><li>Choose your studio location and travel areas</li><li>Take on big custom pieces or quick flash, it is up to you</li></ul></div>
          <div className="feat"><h3>You are in control</h3><ul><li>Join for free with no commitment</li><li>Respond to enquiries only when they suit you</li><li>Free during launch, no per-lead fees</li><li>Message as many customers as you like</li></ul></div>
          <div className="feat"><h3>Grow your reputation</h3><ul><li>A free profile to showcase your portfolio</li><li>Build trust with reviews from real clients</li><li>Self-declared licensing and hygiene badges</li></ul></div>
        </div>
      </div></section>

      {/* FOUNDING MEMBER */}
      <section className="section alt"><div className="wrap">
        <h2>Founding Member offer</h2>
        <p className="deck">Quote My Tattoo is free for artists and studios during launch. Join early and lock in Founding Member benefits.</p>
        <div className="feats">
          <div className="feat"><h3>Free during launch</h3><ul><li>No fees, no card, no commitment</li><li>Receive and respond to enquiries for free</li></ul></div>
          <div className="feat"><h3>Founding Member status</h3><ul><li>First {PRICING.foundingCap} members in total</li><li>Or until {PRICING.foundingDeadline}, whichever comes first</li><li>Lock in {PRICING.foundingDiscountPct}% off for life if paid plans are ever introduced</li></ul></div>
          <div className="feat"><h3>Early access</h3><ul><li>Early access to selected new features</li><li>Recognised as an early supporter</li></ul></div>
        </div>

        <div style={{ maxWidth: 640, margin: "40px auto 0", background: "#fff", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 15.5 }}>
            <thead>
              <tr style={{ background: "var(--plum)", color: "#fff", textAlign: "left" }}>
                <th style={{ padding: "14px 18px" }}>Membership</th>
                <th style={{ padding: "14px 18px" }}>Current planned price</th>
                <th style={{ padding: "14px 18px" }}>Founding Member</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderTop: "1px solid var(--line)" }}>
                <td style={{ padding: "14px 18px", fontWeight: 700 }}>Artist</td>
                <td style={{ padding: "14px 18px" }}>£{PRICING.artistMonthly}/month</td>
                <td style={{ padding: "14px 18px", fontWeight: 700, color: "var(--violet)" }}>£{foundingMonthly(PRICING.artistMonthly)}/month</td>
              </tr>
              <tr style={{ borderTop: "1px solid var(--line)" }}>
                <td style={{ padding: "14px 18px", fontWeight: 700 }}>Studio</td>
                <td style={{ padding: "14px 18px" }}>£{PRICING.studioMonthly}/month</td>
                <td style={{ padding: "14px 18px", fontWeight: 700, color: "var(--violet)" }}>£{foundingMonthly(PRICING.studioMonthly)}/month</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 13.5, marginTop: 14 }}>
          There are no membership fees today. Prices shown are current planned pricing for transparency and may change before any paid memberships are introduced.
        </p>
        <div className="center-cta"><Link className="btn" href="/signup?role=artist">Claim Your Founding Member Spot</Link></div>
      </div></section>

      {/* CTA BAND */}
      <section className="ctaband"><div className="wrap">
        <h2>Say yes to the work you want</h2>
        <Link className="btn" href="/signup?role=artist">Join for Free</Link>
      </div></section>

      {/* EXPERTISE Q&A */}
      <section className="section"><div className="wrap">
        <h2>Share your expertise</h2>
        <p className="deck">Answer questions from people thinking about getting tattooed and stand out as the artist they want to book.</p>
        <div className="qgrid">
          <div className="qcard">
            <div className="qc-top"><div className="qc-cat">Aftercare</div><Chev /></div>
            <h3>How do I stop my new tattoo scabbing so much?</h3>
            <div className="qc-who">Asked by Jess, 12 Jun 2026</div>
            <p className="qc-snip">My tattoo is a few days old and forming thick scabs. Is that normal, and is there anything I can do to help it heal cleanly?</p>
            <Link className="qc-more" href="#">Answer this</Link>
            <Answers n="3 answers" />
          </div>
          <div className="qcard">
            <div className="qc-top"><div className="qc-cat">Fine line</div><Chev /></div>
            <h3>Will a fine line tattoo blur over time?</h3>
            <div className="qc-who">Asked by Aaron, 12 Jun 2026</div>
            <p className="qc-snip">I love the delicate look of fine line work but I have heard it can blur as it ages. Is that true, and does placement make a difference?</p>
            <Link className="qc-more" href="#">Answer this</Link>
            <Answers n="1 answer" />
          </div>
          <div className="qcard">
            <div className="qc-top"><div className="qc-cat">Cover-ups</div><Chev /></div>
            <h3>Can an old faded tattoo be covered?</h3>
            <div className="qc-who">Asked by Priya, 11 Jun 2026</div>
            <p className="qc-snip">I have an old tattoo I would like covered with something new. How dark does the new design need to be to hide it?</p>
            <Link className="qc-more" href="#">Answer this</Link>
            <Answers n="2 answers" />
          </div>
        </div>
      </div></section>

      {/* APP */}
      <section className="app"><div className="wrap"><div className="grid">
        <div>
          <h2>Download the artist app</h2>
          <p>Finding work is even easier in the app. Search enquiries, get instant notifications when a customer messages you, and chat with customers, wherever you are.</p>
          <p style={{ margin: "0 0 10px", fontSize: 12.5, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--violet)" }}>Coming soon</p>
          <div className="badges" style={{ opacity: 0.6 }}>
            <img src="/images/home-7.png" alt="Google Play - coming soon" />
            <img src="/images/home-8.png" alt="App Store - coming soon" />
          </div>
          <p className="dl-alt">In the meantime, manage your leads on the web. <Link href="/signup?role=artist">Sign up free</Link>.</p>
        </div>
        <div className="phone"><img src="/images/app-phone.svg" alt="Quote My Tattoo artist app" width={300} height={600} loading="lazy" /></div>
      </div></div></section>

      {/* STYLES */}
      <section className="section"><div className="wrap">
        <h2 style={{ marginBottom: 50 }}>Other styles</h2>
        <div className="chips">{STYLES.map((s) => <Link className="chip" href="/signup?role=artist" key={s}>{s}</Link>)}</div>
      </div></section>

      {/* SIGN BAR */}
      <section className="signbar"><Link className="wrap" href="/signup?role=artist" style={{ textDecoration: "none" }}>
        <h2>Sign up for free</h2>
        <span className="circ"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
      </Link></section>

      {/* FOOTER */}
      <footer className="bigfoot"><div className="wrap">
        <Link className="flogo" href="/"><span className="mk"><svg width="22" height="28" viewBox="0 0 100 130"><path d="M50 6 C50 6 86 62 86 88 A36 36 0 1 1 14 88 C14 62 50 6 50 6 Z" /></svg></span><span>quotemytattoo<i>.co.uk</i></span></Link>
        <div className="bf-cols">
          <div><h5>For Customers</h5><ul><li><Link href="/new-request">Request a Quote</Link></li><li><Link href="/#how-it-works">How It Works</Link></li><li><Link href="/artists">Directory</Link></li><li><Link href="/quality-standards">Licensing Checks</Link></li></ul></div>
          <div><h5>For Artists</h5><ul><li><Link href="/signup?role=artist">Join as an Artist</Link></li><li><Link href="/quality-standards">Quality standards</Link></li><li><Link href="/help">Artist help</Link></li></ul></div>
          <div><h5>Company</h5><ul><li><Link href="/about">About Us</Link></li><li><Link href="/press">Press &amp; media</Link></li><li><Link href="/careers">Careers</Link></li></ul></div>
          <div><h5>Helpful Resources</h5><ul><li><Link href="/artists">Tattoo styles</Link></li><li><Link href="/tattoo-artists">Cities</Link></li><li><Link href="/guides/how-much-does-a-tattoo-cost-uk">Pricing Guides</Link></li></ul></div>
        </div>
        <div className="bf-bar"><span><Link href="/privacy">Privacy</Link><Link href="/cookies">Cookie Policy</Link><Link href="/terms">Terms and Conditions</Link></span><span>© 2026 Quote My Tattoo Ltd</span></div>
      </div></footer>

      <section className="seoband"><div className="wrap">
        <h2>Find work in your area</h2>
        <div className="links">{CITIES.map((c) => <Link href={`/tattoo-artists/${c.toLowerCase()}`} key={c}>{c}</Link>)}</div>
      </div></section>
    </>
  );
}
