/**
 * app/api/admin/change-password/route.ts
 *
 * PATCH — change the signed-in admin's own password. Requires the current
 * password to be supplied correctly (bcrypt-compared against the stored
 * hash) before a new one is set.
 */
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import prisma from "@/lib/db";
import { getAdminFromToken } from "@/lib/auth";
import { logApiError } from "@/lib/errors/logger";

const schema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export async function PATCH(req: NextRequest) {
  const store = await cookies();
  const token = store.get("admin_token")?.value;
  const admin = await getAdminFromToken(token ?? "");
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data" }, { status: 400 });
    }
    const { currentPassword, newPassword } = parsed.data;

    const record = await prisma.admin.findUnique({ where: { id: admin.id }, select: { passwordHash: true } });
    if (!record) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    const valid = await bcrypt.compare(currentPassword, record.passwordHash);
    if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.admin.update({ where: { id: admin.id }, data: { passwordHash: newHash } });

    // Sign out all other sessions so a leaked/old password stops working
    // immediately; the current session's cookie stays valid since we don't
    // know its token here, only the admin id — the settings page's existing
    // "sign out all sessions" flow covers signing this one out too if wanted.
    await prisma.adminSession.deleteMany({ where: { adminId: admin.id, NOT: { token } } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    await logApiError(err, { route: "/api/admin/change-password" });
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}
