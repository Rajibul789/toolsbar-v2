import { type NextRequest, NextResponse } from "next/server";
import { logAuthError } from "@/lib/errors/logger";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;

  if (token) {
    try {
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient();
      await prisma.adminSession.deleteMany({ where: { token } }).catch(() => {});
      await prisma.$disconnect();
    } catch (err) {
      // Silent to user — logout still completes, but log the failure
      await logAuthError(err, { route: "/api/auth/admin-logout" }).catch(() => {});
    }
  }

  const res = NextResponse.redirect(new URL("/admin/login", req.url));
  res.cookies.delete("admin_token");
  return res;
}