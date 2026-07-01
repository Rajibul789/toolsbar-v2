import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Forward the current pathname as a request header so Server Components
  // (e.g. the root layout's maintenance-mode gate) can read the active route
  // via headers() — Server Components have no access to usePathname().
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  const withPathname = { request: { headers: requestHeaders } };

  // Only guard /admin routes (except /admin/login and API auth routes)
  if (!pathname.startsWith("/admin")) return NextResponse.next(withPathname);
  if (pathname === "/admin/login") return NextResponse.next(withPathname);
  if (pathname.startsWith("/api/auth")) return NextResponse.next(withPathname);

  const token = request.cookies.get("admin_token")?.value;

  if (!token) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Token presence is checked here; full DB validation in API routes
  // For edge runtime compatibility, we do a lightweight check
  return NextResponse.next(withPathname);
}

export const config = {
  // Run on all routes except static assets, so x-pathname is always available
  // to the root layout. /admin/:path* remains covered by this broader matcher,
  // so the existing auth-guard logic above is unaffected.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};