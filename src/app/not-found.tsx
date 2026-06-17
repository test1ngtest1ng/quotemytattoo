import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf8fc] px-6 text-center">
      <div className="mb-8"><Logo /></div>
      <p className="text-6xl font-extrabold text-violet">404</p>
      <h1 className="mt-3 text-2xl font-extrabold text-plum">Page not found</h1>
      <p className="mt-2 max-w-sm text-muted">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="rounded-[10px] bg-violet px-6 py-3 font-semibold text-white transition hover:bg-violet-dark">
          Back to home
        </Link>
        <Link href="/tattoo-artists" className="rounded-[10px] border border-line px-6 py-3 font-semibold text-ink transition hover:border-violet hover:text-violet">
          Find artists
        </Link>
      </div>
    </div>
  );
}
