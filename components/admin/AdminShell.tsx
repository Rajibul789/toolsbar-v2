"use client";

import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

/**
 * Admin chrome: sidebar + main content column.
 *
 * The "is this the login screen?" decision has to be made on the client with
 * usePathname(). The previous version read an `x-pathname` header in the
 * (admin) layout, which is a Server Component: layouts are NOT re-rendered on
 * client-side navigation between pages that share them, so after a successful
 * login (router.push("/admin")) the layout still believed it was on
 * /admin/login — the sidebar appeared (it guards itself via usePathname) but
 * <main> kept no left margin, leaving the dashboard hidden under the sidebar
 * until a full page reload.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showSidebar = pathname !== "/admin/login";

  return (
    <div className="flex min-h-screen" style={{ background: "var(--abyss)" }}>
      <AdminSidebar />

      {/* Main */}
      <main className={`flex-1 min-h-screen overflow-x-hidden ${showSidebar ? "ml-64" : ""}`}>
        {children}
      </main>
    </div>
  );
}