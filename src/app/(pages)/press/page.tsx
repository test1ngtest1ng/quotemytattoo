import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Press & media",
  description: "Press and media enquiries for Quote My Tattoo.",
  alternates: { canonical: "/press" },
};

export default function PressPage() {
  return (
    <article className="legal">
      <div className="crumb"><Link href="/">Home</Link> / Press &amp; media</div>
      <h1>Press &amp; media</h1>
      <p>
        For interviews, data, commentary on the UK tattoo industry, or brand assets, we&apos;re happy to help.
      </p>
      <h2>Media enquiries</h2>
      <p>Email <a href="mailto:press@quotemytattoo.co.uk">press@quotemytattoo.co.uk</a> and we&apos;ll get back to you quickly.</p>
      <h2>About Quote My Tattoo</h2>
      <p>
        Quote My Tattoo is a UK marketplace connecting people with trusted, reviewed tattoo artists and
        studios. <Link href="/about">Read more about us</Link>.
      </p>
    </article>
  );
}
