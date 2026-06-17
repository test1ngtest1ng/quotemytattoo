import "@/styles/city.css";
import "@/styles/legal.css";
import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";

export default function PagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="qmt-pub">
      <header className="hdr">
        <div className="wrap">
          <Link className="logo" href="/">
            <span className="mk"><svg width="22" height="28" viewBox="0 0 100 130" aria-hidden="true"><path d="M50 6 C50 6 86 62 86 88 A36 36 0 1 1 14 88 C14 62 50 6 50 6 Z" /></svg></span>
            <span>quotemytattoo<i>.co.uk</i></span>
          </Link>
          <PublicNav links={[
            { href: "/artists", label: "Directory" },
            { href: "/new-request", label: "Request a quote", cta: true },
          ]} />
        </div>
      </header>

      <main className="legal-main">{children}</main>

      <footer className="bigfoot">
        <div className="wrap">
          <Link className="flogo" href="/">
            <span className="mk"><svg width="22" height="28" viewBox="0 0 100 130" aria-hidden="true"><path d="M50 6 C50 6 86 62 86 88 A36 36 0 1 1 14 88 C14 62 50 6 50 6 Z" /></svg></span>
            <span>quotemytattoo<i>.co.uk</i></span>
          </Link>
          <div className="bf-bar">
            <span>
              <Link href="/privacy">Privacy</Link>
              <Link href="/cookies">Cookie Policy</Link>
              <Link href="/terms">Terms and Conditions</Link>
            </span>
            <span>© 2026 Quote My Tattoo Ltd</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
