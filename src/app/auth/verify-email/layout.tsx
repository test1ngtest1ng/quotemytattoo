import { Logo } from "@/components/Logo";

export default function VerifyEmailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf8fc] px-4 py-12">
      <div className="mb-8">
        <Logo />
      </div>
      <div className="w-full max-w-md rounded-[14px] border border-line bg-white p-8 shadow-[0_1px_2px_rgba(38,18,48,.06),0_12px_26px_rgba(38,18,48,.10)]">
        {children}
      </div>
    </div>
  );
}
