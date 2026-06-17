import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logAuthError } from "@/lib/errors/logger";

const schema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { email, password } = parsed.data;

    // Lazy-import heavy deps only on server
    const [{ PrismaClient }, { default: bcrypt }] = await Promise.all([
      import("@prisma/client"),
      import("bcryptjs"),
    ]);

    const prisma = new PrismaClient();

    try {
      const admin = await prisma.admin.findUnique({ where: { email } });
      if (!admin) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }

      const valid = await bcrypt.compare(password, admin.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }

      // Create session token
      const { randomBytes } = await import("crypto");
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await prisma.adminSession.create({
        data: { adminId: admin.id, token, expiresAt },
      });

      const res = NextResponse.json({ ok: true });
      res.cookies.set("admin_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: expiresAt,
        path: "/",
      });

      return res;
    } finally {
      await prisma.$disconnect();
    }
  } catch (err) {
    console.error("Login error:", err);
    await logAuthError(err, { route: "/api/auth/admin-login" });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}