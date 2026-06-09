import prisma from "./db";

export async function verifyAdminToken(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const session = await prisma.adminSession.findUnique({
      where: { token },
      select: { expiresAt: true },
    });
    if (!session) return false;
    if (session.expiresAt < new Date()) {
      // Clean up expired session
      await prisma.adminSession.delete({ where: { token } }).catch(() => {});
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function getAdminFromToken(token: string) {
  if (!token) return null;
  try {
    const session = await prisma.adminSession.findUnique({
      where: { token },
      include: { admin: { select: { id: true, email: true, name: true, role: true } } },
    });
    if (!session || session.expiresAt < new Date()) return null;
    return session.admin;
  } catch {
    return null;
  }
}
