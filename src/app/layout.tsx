import type { Metadata } from "next";
import { Suspense } from "react";
import { Figtree } from "next/font/google";
import "./globals.css";
import { CookieConsent } from "@/components/CookieConsent";
import { ModeToast } from "@/components/ModeToast";
import { TopProgressBar } from "@/components/TopProgressBar";
import { SITE_URL as siteUrl } from "@/lib/site";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Quote My Tattoo - Get quotes from tattoo artists near you",
    template: "%s · Quote My Tattoo",
  },
  description:
    "Post your tattoo idea and get quotes from trusted, reviewed tattoo artists near you. Free to use.",
  openGraph: {
    siteName: "Quote My Tattoo",
    type: "website",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: "Quote My Tattoo - Get quotes from tattoo artists near you",
    description:
      "Post your tattoo idea and get quotes from trusted, reviewed tattoo artists near you. Free to use.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${figtree.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans antialiased">
        <Suspense fallback={null}>
          <TopProgressBar />
        </Suspense>
        {children}
        <Suspense fallback={null}>
          <ModeToast />
        </Suspense>
        <CookieConsent />
      </body>
    </html>
  );
}
