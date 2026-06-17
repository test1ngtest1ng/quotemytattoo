import Link from "next/link";
import { getUser } from "@/lib/auth/user";
import { LogoMark } from "@/components/marketing/LogoMark";
import { MarketingMobileNav } from "@/components/marketing/MarketingMobileNav";

export async function MarketingHeader() {
  const user = await getUser();

  return (
    <>
      <div className="announce">
        Are you a tattoo artist looking for customers?{" "}
        <Link href="/for-artists">Join for free</Link>
      </div>

      <div className="head">
        <div className="wrap">
          <nav className="nav">
            <Link className="logo" href="/">
              <span className="mk">
                <LogoMark />
              </span>
              <span className="lt">
                quotemytattoo<i>.co.uk</i>
              </span>
            </Link>
            <div className="nav-right">
              <Link className="nav-hide" href="/artists">
                Directory
              </Link>
              <Link className="nav-hide" href="/new-request">
                Request a Quote
              </Link>
              {user ? (
                <Link className="nav-hide" href="/dashboard">
                  Dashboard
                </Link>
              ) : (
                <Link className="nav-hide" href="/login">
                  Log In
                </Link>
              )}
              <Link className="btn-outline-w" href="/for-artists">
                Sign Up as an Artist
              </Link>
              <MarketingMobileNav
                light
                links={[
                  { href: "/artists", label: "Directory" },
                  { href: "/new-request", label: "Request a quote" },
                  { href: user ? "/dashboard" : "/login", label: user ? "Dashboard" : "Log in" },
                  { href: "/for-artists", label: "Sign up as an artist" },
                ]}
              />
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}
