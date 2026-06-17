/**
 * app/api/admin/errors/[id]/route.ts
 *
 * PATCH /api/admin/errors/[id] — Update error report status (admin only)
 * DELETE /api/admin/errors/[id] — Delete error report (admin only)
 */

import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromToken } from "@/lib/auth";
import { logApiError } from "@/lib/errors/logger";

const patchSchema = z.object({
  status: z.enum(["NEW", "INVESTIGATING", "FIXED", "CLOSED"]),
});

// ── Auth helper ───────────────────────────────────────────────────────────────
async function requireAdmin() {
  const cookieStore = await cookies();
  const token       = cookieStore.get("admin_token")?.value;
  return getAdminFromToken(token ?? "");
}

// ── PATCH — update status ─────────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid status", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.errorReport.update({
      where:  { id },
      data:   { status: parsed.data.status },
      select: { id: true, status: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    await logApiError(err, { route: "/api/admin/errors/[id]" });
    return NextResponse.json({ error: "Report not found or update failed" }, { status: 404 });
  }
}

// ── DELETE — remove report ────────────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    await prisma.errorReport.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    await logApiError(err, { route: "/api/admin/errors/[id]" });
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
}