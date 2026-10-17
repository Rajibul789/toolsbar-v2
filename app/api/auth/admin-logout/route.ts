import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { logAuthError } from "@/lib/errors/logger";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;

  if (token) {
    try {
      // Shared Prisma client (lib/db.ts). The previous version constructed a
      // brand-new PrismaClient — and a new connection — on every logout and
      // swallowed deleteMany failures, which both wastes pooled connections
      // and could leave a session row alive without any trace.
      await prisma.adminSession.deleteMany({ where: { token } });
    } catch (err) {
      // Silent to the user — logout still completes (the cookie is removed
      // below) — but the failure is logged.
      await logAuthError(err, { route: "/api/auth/admin-logout" }).catch(() => {});
    }
  }

  // 303 See Other: after a form POST the browser must follow with a GET.
  // (The default 307 makes the browser re-POST to /admin/login.)
  const res = NextResponse.redirect(new URL("/admin/login", req.url), 303);
  res.cookies.delete("admin_token");
  return res;
}