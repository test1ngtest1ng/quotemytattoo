"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/connections", label: "Connections" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/verification", label: "Verify" },
  { href: "/admin/requests", label: "Leads" },
  { href: "/admin/guest-requests", label: "Guest" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/audit", label: "Audit" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="admin-nav">
      {TABS.map((t) => {
        const on = t.href === "/admin" ? path === "/admin" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={on ? "on" : ""}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
