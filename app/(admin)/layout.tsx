import type { Metadata } from "next";
import { headers } from "next/headers";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const metadata: Metadata = {
  title: { template: "%s | ToolsBar Admin", default: "Admin | ToolsBar" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
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