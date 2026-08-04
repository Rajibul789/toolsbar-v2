"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Zap, LayoutDashboard, Wrench, BookOpen, Globe,
  Tag, FolderOpen, Settings, TrendingUp, LogOut, Star, Bug,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Dashboard",      href: "/admin",               icon: LayoutDashboard },
  { label: "Tools",          href: "/admin/tools",          icon: Wrench },
  { label: "Blog Posts",     href: "/admin/blog",           icon: BookOpen },
  { label: "Featured Posts", href: "/admin/blog/featured",  icon: Star },
  { label: "Homepage",       href: "/admin/homepage",       icon: Globe },
  { label: "Categories",     href: "/admin/categories",     icon: FolderOpen },
  { label: "Tags",           href: "/admin/tags",           icon: Tag },
  { label: "SEO",            href: "/admin/seo",            icon: TrendingUp },
  { label: "Settings",       href: "/admin/settings",       icon: Settings },
];

const DEVELOPER_NAV = [
  { label: "Error Center", href: "/admin/error-center", icon: Bug },
];

/** A nav item is "active" on an exact match, or for /admin/blog it's also
 * active on nested post routes (/admin/blog/new, /admin/blog/[id]) — but not
 * on /admin/blog/featured, which has its own entry. */
function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/admin/blog") {
    return pathname === "/admin/blog" || (pathname.startsWith("/admin/blog/") && pathname !== "/admin/blog/featured" && !pathname.startsWith("/admin/blog/featured/"));
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar() {
  const pathname = usePathname();

  // The login screen isn't part of the authenticated admin shell — showing
  // a sidebar full of admin links before the user has logged in is misleading.
  if (pathname === "/admin/login") return null;

  return (
    <aside className="admin-sidebar flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-neon-cyan/8">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(0,245,255,0.12)", border: "1px solid rgba(0,245,255,0.3)" }}>
          <Zap className="w-3.5 h-3.5 text-neon-cyan" />
        </div>
        <div>
          <p className="font-display text-sm font-black text-white tracking-widest">TOOLSBAR</p>
          <p className="text-[10px] font-mono text-text-muted tracking-wider">ADMIN PANEL</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {/* Main navigation */}
        <div className="space-y-0.5">
          {NAV.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href} className={cn("admin-nav-item", isActive(pathname, href) && "active")}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          ))}
        </div>

        {/* Developer Tools section */}
        <div className="mt-4 pt-4 border-t" style={{ borderColor: "rgba(239,68,68,0.12)" }}>
          <p className="px-4 mb-1 text-[10px] font-mono font-bold tracking-widest uppercase"
            style={{ color: "rgba(239,68,68,0.45)" }}>
            Developer Tools
          </p>
          <div className="space-y-0.5">
            {DEVELOPER_NAV.map(({ label, href, icon: Icon }) => (
              <Link key={href} href={href}
                className={cn("admin-nav-item", isActive(pathname, href) && "active")}
                style={{ color: "rgba(239,68,68,0.65)" }}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-neon-cyan/8 p-4 space-y-1">
        <Link href="/" target="_blank" className="admin-nav-item block text-[11px]">
          ↗ View Live Site
        </Link>
        <form action="/api/auth/admin-logout" method="POST">
          <button type="submit"
            className="admin-nav-item w-full text-left flex items-center gap-3 text-neon-red/60 hover:text-neon-red">
            <LogOut className="w-4 h-4" />Sign Out
          </button>
        </form>
      </div>
    </aside>
  );
}
