import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/lib/auth/user";
import { Logo } from "@/components/Logo";
import { SubmitButton } from "@/components/SubmitButton";
import { acceptInvite } from "@/lib/data/studio";

export const metadata: Metadata = {
  title: "Studio Invitation",
  robots: { index: false, follow: false },
};

export default async function JoinStudioPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("studio_invites")
    .select("status, studios!studio_invites_studio_id_fkey(name)")
    .eq("token", token)
    .maybeSingle();

  const user = await getUser();
  const studioName = (invite?.studios as { name?: string } | null)?.name;
  const valid = invite && invite.status === "pending";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf8fc] px-4 py-12">
      <div className="mb-8"><Logo /></div>
      <div className="w-full max-w-md rounded-[14px] border border-line bg-white p-8 text-center">
        {valid ? (
          <>
            <h1 className="text-2xl font-extrabold text-plum">Join {studioName ?? "this studio"}</h1>
            <p className="mt-2 text-muted">
              You&rsquo;ve been invited to join <strong>{studioName ?? "a studio"}</strong> on Quote My Tattoo.
              {!user && " Sign in or create your artist account to accept."}
            </p>
            <form action={acceptInvite} className="mt-6">
              <input type="hidden" name="token" value={token} />
              <SubmitButton className="w-full rounded-[10px] bg-violet px-5 py-3 font-semibold text-white shadow-[0_2px_0_var(--color-violet-dark)] transition hover:bg-violet-dark" pendingText="Joining…">
                {user ? "Accept invitation" : "Continue to accept"}
              </SubmitButton>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold text-plum">Invitation Not Available</h1>
            <p className="mt-2 text-muted">This invitation is invalid or has already been used.</p>
            <Link href="/" className="mt-6 inline-block font-semibold text-violet">Go home</Link>
          </>
        )}
      </div>
    </div>
  );
}
