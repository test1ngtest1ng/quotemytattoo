import "@/styles/account.css";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { AppHeader } from "@/components/AppHeader";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Central gate - protects every /admin/* route. Non-admins are redirected.
  await requireAdmin();
  return (
    <>
      <AppHeader />
      <main className="page">
        <div className="wrap">
          <h1 className="ptitle" style={{ marginBottom: 18 }}>Admin</h1>
          <AdminNav />
          {children}
        </div>
      </main>
    </>
  );
}
