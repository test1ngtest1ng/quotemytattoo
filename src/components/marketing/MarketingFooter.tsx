import Link from "next/link";
import Image from "next/image";
import { LogoMark } from "@/components/marketing/LogoMark";
import { Trustpilot } from "@/components/marketing/Trustpilot";

const CITIES = ["London","Manchester","Birmingham","Leeds","Glasgow","Bristol","Liverpool","Edinburgh","Cardiff","Sheffield","Nottingham","Brighton","Newcastle","Leicester","More cities +"];
const STYLES = ["Fine line","Japanese","Realism","Blackwork","Traditional","Neo-traditional","Lettering & script","Geometric","Dotwork","Watercolour","Cover-ups","More styles +"];

export function MarketingFooter() {
  return (
    <>
      <div className="bigfoot">
        <div className="wrap">
          <Link className="flogo" href="/">
            <span className="mk"><LogoMark fill="#311A41" /></span>
            <span className="lt">quotemytattoo<i>.co.uk</i></span>
          </Link>

          <div className="bf-cols">
            <div>
              <h5>For Customers</h5>
              <ul>
                <li><Link href="/new-request">Request a Quote</Link></li>
                <li><Link href="/#how-it-works">How It Works</Link></li>
                <li><Link href="/artists">Find a tattoo artist</Link></li>
                <li><Link href="/tattoo-artists">Browse by city</Link></li>
                <li><Link href="/quality-standards">Licensing Checks</Link></li>
                <li><Link href="/help">Customer Help</Link></li>
              </ul>
            </div>
            <div>
              <h5>For Artists</h5>
              <ul>
                <li><Link href="/signup?role=artist">Join as an Artist</Link></li>
                <li><Link href="/quality-standards">Quality standards</Link></li>
                <li><Link href="/reviews-policy">Reviews policy</Link></li>
                <li><Link href="/help">Artist help</Link></li>
              </ul>
            </div>
            <div>
              <h5>Company</h5>
              <ul>
                <li><Link href="/about">About Us</Link></li>
                <li><Link href="/press">Press &amp; media</Link></li>
                <li><Link href="/careers">Careers</Link></li>
                <li><Link href="/for-artists">Become a partner</Link></li>
              </ul>
            </div>
            <div>
              <h5>Helpful Resources</h5>
              <ul>
                <li><Link href="/artists">Browse artists &amp; studios</Link></li>
                <li><Link href="/tattoo-artists">Cities</Link></li>
                <li><Link href="/guides/how-much-does-a-tattoo-cost-uk">Pricing Guides</Link></li>
                <li><Link href="/guides/how-long-does-a-tattoo-take-to-heal">Aftercare guides</Link></li>
                <li><Link href="/guides/what-is-a-tattoo-consent-form">Consent forms</Link></li>
                <li><Link href="/guides">Articles</Link></li>
              </ul>
            </div>
          </div>

          <div className="bf-bottom">
            <div className="bf-left">
              <div className="bf-social">
                <a href="https://instagram.com/quotemytattoo" target="_blank" rel="noreferrer noopener" aria-label="Quote My Tattoo on Instagram">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
                </a>
                <a href="https://www.tiktok.com/@quotemytattoo" target="_blank" rel="noreferrer noopener" aria-label="Quote My Tattoo on TikTok">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16 3c.3 2.3 1.7 3.9 4 4.2V10c-1.5 0-2.9-.5-4-1.3V15a5.5 5.5 0 1 1-5.5-5.5c.3 0 .6 0 .9.1v2.7a2.8 2.8 0 1 0 2 2.7V3z" /></svg>
                </a>
              </div>
              <Trustpilot wrapClass="foot-trust" star={14} />
            </div>
            <div className="bf-badges" style={{ opacity: 0.55 }} title="Apps coming soon">
              <Image src="/images/home-10.png" alt="App Store - coming soon" width={135} height={40} />
              <Image src="/images/home-11.png" alt="Google Play - coming soon" width={135} height={40} />
            </div>
          </div>

          <div className="bf-bar">
            <span>
              <Link href="/privacy">Privacy</Link>
              <Link href="/cookies">Cookie Policy</Link>
              <Link href="/terms">Terms and Conditions</Link>
            </span>
            <span>© 2026 Quote My Tattoo Ltd</span>
          </div>
        </div>
      </div>

      <div className="seoband">
        <div className="wrap">
          <div className="seo-group">
            <h2>Find tattoo artists in your area</h2>
            <div className="links">
              {CITIES.map((c) => (
                <Link key={c} href={c.includes("+") ? "/tattoo-artists" : `/artists?location=${encodeURIComponent(c)}`}>{c}</Link>
              ))}
            </div>
          </div>
          <div className="seo-group">
            <h2>Browse by style</h2>
            <div className="links">
              {STYLES.map((s) => (
                <Link key={s} href="/artists">{s}</Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
