import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/SignupForm";
import type { UserRole } from "@/lib/types";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; next?: string }>;
}) {
  const { role, next } = await searchParams;
  const isArtist = role === "artist";
  const isStudio = role === "studio";
  const userRole: UserRole = isArtist ? "artist" : isStudio ? "studio_owner" : "customer";

  const heading = isStudio
    ? "Register your studio"
    : isArtist
      ? "Join as an artist"
      : "Create your account";
  const sub = isStudio
    ? "Free during launch - claim your Founding Studio spot."
    : isArtist
      ? "Free during launch - claim your Founding Member spot."
      : "Post your tattoo idea and get quotes from artists near you.";

  return (
    <>
      <h1 className="mb-1 text-2xl font-extrabold text-plum">{heading}</h1>
      <p className="mb-6 text-sm text-muted">{sub}</p>
      <SignupForm role={userRole} next={next} />
    </>
  );
}
