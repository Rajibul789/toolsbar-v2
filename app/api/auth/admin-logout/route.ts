import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;

  if (token) {
    try {
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient();
      await prisma.adminSession.deleteMany({ where: { token } }).catch(() => {});
      await prisma.$disconnect();
    } catch { /* silent */ }
  }

  const res = NextResponse.redirect(new URL("/admin/login", req.url));
  res.cookies.delete("admin_token");
  return res;
}
