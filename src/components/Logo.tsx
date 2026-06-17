import Link from "next/link";
import { LogoMark } from "@/components/marketing/LogoMark";

/** Brand logo used across the app (backend) pages - matches the marketing site:
 *  the ink-drop mark + "quotemytattoo.co.uk". */
export function Logo({
  className = "",
  light = false,
  compact = false,
}: {
  className?: string;
  light?: boolean;
  /** App-header variant: smaller on mobile and hides ".co.uk" to save space. */
  compact?: boolean;
}) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2.5 ${compact ? "text-xl sm:text-2xl" : "text-2xl"} font-extrabold tracking-tight ${
        light ? "text-white [&_svg]:fill-white" : "text-plum [&_svg]:fill-violet"
      } ${className}`}
    >
      <LogoMark />
      <span>
        quotemytattoo
        <span className={`text-[0.7em] font-bold ${compact ? "hidden sm:inline " : ""}${light ? "text-[#C9B7DA]" : "text-muted"}`}>
          .co.uk
        </span>
      </span>
    </Link>
  );
}
