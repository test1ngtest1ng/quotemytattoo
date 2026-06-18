/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import Image from "next/image";
import { HeroSearchBox } from "@/components/marketing/HeroSearchBox";
import { Trustpilot } from "@/components/marketing/Trustpilot";

const ArrowCirc = ({ size = 18 }: { size?: number }) => (
  <span className="circ">
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  </span>
);

const Chevron = () => (
  <span className="chev">
    <svg width="13" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  </span>
);

const Clock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v4.8l3 1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const GUIDES = [
  { slug: "is-your-tattoo-artist-licensed", cat: "Safety & standards", title: "Is your tattoo artist licensed?", snip: "Every UK studio must be registered with its local council. Here's how to check your artist is licensed, insured and following the right hygiene standards before you book.", read: "4 min read" },
  { slug: "what-is-a-tattoo-consent-form", cat: "Before you book", title: "What is a consent form?", snip: "Before any tattoo you'll sign a consent form and a short medical questionnaire. Here's what they cover, why they matter, and what a good studio will always ask you.", read: "3 min read" },
  { slug: "how-long-does-a-tattoo-take-to-heal", cat: "Aftercare", title: "How long does a tattoo take to heal?", snip: "A fresh tattoo looks healed long before it actually is. We walk through the surface and deeper healing stages, typical timelines, and how to care for it at each step.", read: "5 min read" },
];

const STYLE_CARDS = [
  { img: "/images/home-3.jpg", alt: "Fine line floral tattoo on an arm", name: "Fine line", desc: "Curious what a fine line piece costs? Get free quotes from artists who specialise in delicate, single-needle linework near you…", cnt: "412 fine line artists" },
  { img: "/images/home-4.jpg", alt: "Japanese dragon back-piece tattoo", name: "Japanese", desc: "Thinking about a Japanese piece? Get free quotes from artists specialising in traditional irezumi, dragons and koi near you…", cnt: "168 Japanese artists" },
  { img: "/images/home-5.jpg", alt: "Black and grey realism portrait tattoo on a forearm", name: "Realism", desc: "Want a realistic portrait or black-and-grey piece? Get free quotes from realism specialists near you…", cnt: "309 realism artists" },
];

const REVIEWS = [
  { h: "Fine line wildflowers, forearm", q: "Three artists replied within a day and didn't make me feel daft for a small piece. The price guide was spot on.", biz: "Mara Whitlock" },
  { h: "Japanese sleeve, first session", q: "Posted my idea once and got proper quotes instead of being left on read. Booked in within the week.", biz: "Ink & Iron Studio" },
  { h: "Cover-up of old lettering", q: "Didn't think it could be saved. The artist talked me through the options and nailed it. Couldn't be happier.", biz: "Deniz at Northgate" },
  { h: "Matching tattoos with my sister", q: "Easy to compare artists by their actual work. Felt safe the whole way through and the studio was spotless.", biz: "Rose Parlour" },
  { h: "First tattoo, small script", q: "As a nervous first-timer this made it painless to find someone patient. Loved the whole experience.", biz: "J. Reve Tattoo" },
];

export default function Home() {
  return (
    <>
      {/* HERO */}
      <div className="hero">
        <div className="wrap">
          <div className="hero-grid">
            <div className="hero-left">
              <h1>Get free quotes from tattoo artists near you</h1>
              <p className="joblabel">What do you want tattooed?</p>
              <HeroSearchBox />
            </div>
            <div className="hero-right">
              <div className="photo">
                <span className="photo-tag">
                  <svg width="14" height="14" viewBox="0 0 24 24"><path d="M12 2l3 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.4 21.7l1.8-7.3L1.5 9.5 9 8.9z" /></svg> Mara · 5/5
                </span>
                <Image className="scene" src="/images/home-1.jpg" alt="A tattoo artist at work on a client's arm" fill sizes="(max-width: 760px) 90vw, 480px" priority />
                <div className="bbox" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TRUST + STATS */}
      <div className="stats-wrap">
        <div className="wrap">
          <Trustpilot wrapClass="trust-light" star={18} />
          <div className="stats">
            <div className="stat"><b>1,840</b><span>UK artists</span></div>
            <div className="stat"><b>40+</b><span>tattoo styles</span></div>
            <div className="stat"><b>12,400</b><span>reviews</span></div>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div className="section hiw" id="how-it-works">
        <div className="wrap">
          <h2>How it works</h2>
          <p className="deck">Three steps from a fuzzy idea to a booked-in tattoo you&rsquo;re excited about.</p>
          <div className="steps">
            {[
              { n: "STEP 1", t: "Upload the design you want tattooed", p: "Add your design, tap where it goes and your size. Takes 90 seconds, and it’s free." },
              { n: "STEP 2", t: "Artists respond with quotes", p: "Matched local artists reply with a price. No chasing ten studios yourself." },
              { n: "STEP 3", t: "Review artists and choose", p: "Compare portfolios, reviews and reply rates, then book who’s right for you." },
            ].map((s, i) => (
              <div className="stepcard" key={s.n}>
                <div className="ill"><img className="ill-img" src={`/images/step-${i + 1}.svg`} alt="" width={220} height={220} /></div>
                <p className="ey">{s.n}</p>
                <h3>{s.t}</h3>
                <p>{s.p}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 36 }}>
            <Link className="btn" href="/new-request">Upload Your Design, It&rsquo;s Free</Link>
          </div>
        </div>
      </div>

      {/* WHY RELIABLE */}
      <div className="section why-sec">
        <div className="wrap">
          <h2>Why Quote My Tattoo is the reliable way</h2>
          <p className="deck">Big or small, upload the tattoo you want and get matched with verified UK artists who can bring it to life.</p>
          <Trustpilot wrapClass="why-trust" star={18} />
          <div className="why-toplink">
            <Link className="arrow-link-sm" href="/quality-standards"><ArrowCirc /><span className="txt">More info about our checks here</span></Link>
          </div>
          <div className="why-grid">
            <div className="why-feats">
              <div className="feat">
                <h3>Get matched with available artists</h3>
                <p>Upload your design for free and receive quotes from local artists who are keen to take it on.</p>
              </div>
              <div className="feat">
                <h3>Choose who you want to connect with</h3>
                <p>Read reviews, view full portfolios and browse healed work before you decide who to message, so you can make an informed choice.</p>
              </div>
              <div className="feat">
                <h3>Book with confidence</h3>
                <p>Every artist is checked when they join, covering council licensing, ID, studio hygiene and insurance, so you can book knowing you&rsquo;re in safe hands.</p>
              </div>
              <Link className="arrow-link-sm" href="/quality-standards"><ArrowCirc /><span className="txt">More info about our checks here</span></Link>
            </div>
            <div className="why-phone"><Image src="/images/home-2.jpg" alt="Quote My Tattoo app showing matched tattoo artists" width={820} height={990} sizes="(max-width: 880px) 90vw, 520px" /></div>
          </div>
        </div>
      </div>

      {/* CTA BAND */}
      <div className="cta-band">
        <div className="wrap">
          <h2>Ready to find your artist?</h2>
          <Link className="btn-violet-lg" href="/new-request">Request a Quote</Link>
        </div>
      </div>

      {/* GUIDES */}
      <div className="section guide-sec">
        <div className="wrap">
          <h2>Guides</h2>
          <p className="deck">Know what to look for before, during and after your tattoo. <Link href="/guides" className="deck-link">Browse all guides</Link></p>
          <div className="guide-grid">
            {GUIDES.map((g) => (
              <Link className="guide-card" href={`/guides/${g.slug}`} key={g.title}>
                <Chevron />
                <div className="gc-body">
                  <div className="gc-cat">{g.cat}</div>
                  <h3>{g.title}</h3>
                  <p className="gc-snip">{g.snip}</p>
                  <span className="gc-more">Read more</span>
                </div>
                <div className="gc-foot"><Clock /> {g.read}</div>
              </Link>
            ))}
          </div>
          <div className="guide-cta">
            <p>Want to get it right?</p>
            <Link className="btn-violet-outline" href="/guides">Browse All Guides</Link>
          </div>
        </div>
      </div>

      {/* POPULAR STYLES */}
      <div className="section alt styles-sec">
        <div className="wrap">
          <h2>Popular Styles</h2>
          <div className="trade-grid">
            {STYLE_CARDS.map((c) => (
              <div className="trade" key={c.name}>
                <div className="t-img"><Image src={c.img} alt={c.alt} fill sizes="(max-width: 1000px) 90vw, 360px" /></div>
                <div className="t-body">
                  <h3>{c.name}</h3>
                  <p className="t-desc">{c.desc} <Link href="/artists" className="learn">Learn more</Link></p>
                </div>
                <div className="t-foot">
                  <p className="t-cnt">{c.cnt}</p>
                  <p className="t-reg">in the UK</p>
                  <Link className="view-btn" href="/new-request">View all</Link>
                </div>
              </div>
            ))}
          </div>
          <div className="more-wrap"><Link className="more-link" href="/artists">View more styles <span>&rarr;</span></Link></div>
        </div>
      </div>

      {/* LOOKING FOR CUSTOMERS */}
      <div className="section leads">
        <div className="wrap">
          <div className="promo rev">
            <div className="ptext">
              <h2>Looking for customers?</h2>
              <h3 style={{ fontSize: 26, fontWeight: 800, color: "var(--plum)", margin: "0 0 14px" }}>Grow your studio with Quote My Tattoo</h3>
              <p>Get a steady stream of local enquiries from people who already know what they want. Fill quiet weeks, take on guest spots, and only reply to the jobs that suit you. Free to join.</p>
              <Link className="arrow-link" href="/signup?role=artist"><ArrowCirc size={22} /><span className="txt">Artists join for free</span></Link>
            </div>
            <div className="pimg-photo"><Image src="/images/home-6.jpg" alt="A tattoo artist showing portfolio work to a client in a studio" fill sizes="(max-width: 820px) 90vw, 520px" /></div>
          </div>
        </div>
      </div>

      {/* DOWNLOAD APP */}
      <div className="section app-dl">
        <div className="wrap">
          <div className="promo app-grid">
            <div className="ptext">
              <h2>Download our app</h2>
              <p>Finding your artist is even easier in the app. Upload your design in an instant, chat with artists, get reminders, and leave a review once you&rsquo;re inked, all from your phone.</p>
              <p style={{ margin: "0 0 10px", fontSize: 12.5, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--violet)" }}>Coming soon</p>
              <div className="store-badges" style={{ opacity: 0.6 }}>
                <img src="/images/home-7.png" alt="Google Play - coming soon" />
                <img src="/images/home-8.png" alt="App Store - coming soon" />
              </div>
              <p className="dl-alt">In the meantime, <Link href="/new-request">request a quote on the web</Link>. Are you a tattoo artist? <Link href="/signup?role=artist">Join free</Link>.</p>
            </div>
            <div className="pimg-phone app-phone"><img src="/images/app-phone.svg" alt="Quote My Tattoo app" width={300} height={600} loading="lazy" /></div>
          </div>
        </div>
      </div>

      {/* REVIEWS BAND */}
      <div className="revband" style={{ backgroundImage: "url('/images/home-9.jpg')" }}>
        <div className="wrap">
          <div className="review-scroll">
            <div className="rev-intro">
              <h2>Thousands of genuine reviews</h2>
              <p>Reviews on Quote My Tattoo are written by customers like you.</p>
              <Link className="ri-btn" href="/new-request">Request a Quote</Link>
            </div>
            {REVIEWS.map((r) => (
              <div className="rev2" key={r.h}>
                <h4>{r.h}</h4>
                <div className="rstars">★★★★★</div>
                <p className="q">&ldquo;{r.q}&rdquo;</p>
                <div className="biz">{r.biz}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="revbar">
        <div className="wrap">
          <Link className="in" href="/new-request">
            <span>Request a quote</span>
            <span className="round">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </span>
          </Link>
        </div>
      </div>
    </>
  );
}
