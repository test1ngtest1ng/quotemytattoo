import Link from "next/link";

export function AccountHeader({ active }: { active?: "requests" }) {
  return (
    <header className="hdr">
      <div className="wrap">
        <Link className="logo" href="/">
          <span className="mk">
            <svg width="22" height="28" viewBox="0 0 100 130" aria-hidden="true"><path d="M50 6 C50 6 86 62 86 88 A36 36 0 1 1 14 88 C14 62 50 6 50 6 Z" /></svg>
          </span>
          <span>quotemytattoo<i>.co.uk</i></span>
        </Link>
        <nav className="nav">
          <Link className="linkhide" href="/new-request">Request a quote</Link>
          <Link className={active === "requests" ? "active" : ""} href="/my-requests">My requests</Link>
          <Link className="acct" href="/account">My account</Link>
        </nav>
      </div>
    </header>
  );
}
