import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import prisma from "@/lib/db";
import { logAuthError } from "@/lib/errors/logger";

const schema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

// ─── IP-based brute-force protection ─────────────────────────────────────────
// This is the single most security-critical endpoint in the app — it gates
// the entire admin panel — and previously had ZERO protection against
// automated password-guessing. A stricter window than the other rate-limited
// routes (5 attempts / 15 min per IP) matches standard anti-brute-force
// practice: generous enough for a real admin who mistypes a password, tight
// enough to make scripted guessing impractical.
const IP_MAP    = new Map<string, number[]>();
const IP_LIMIT  = 5;
const IP_WINDOW = 15 * 60 * 1000; // 15 minutes

function isIpRateLimited(ip: string): boolean {
  const now     = Date.now();
  const history = (IP_MAP.get(ip) ?? []).filter((t) => now - t < IP_WINDOW);
  if (history.length >= IP_LIMIT) return true;
  history.push(now);
  IP_MAP.set(ip, history);
  if (IP_MAP.size > 1000) {
    for (const [k, times] of IP_MAP.entries()) {
      if (times.every((t) => now - t >= IP_WINDOW)) IP_MAP.delete(k);
    }
  }
  return false;
}

// ─── Timing side-channel countermeasure ─────────────────────────────────────
// bcrypt.compare() is deliberately slow (proportional to its cost factor).
// If we only call it when an admin with the given email actually exists,
// a "no such email" response returns near-instantly while a "wrong password"
// response takes ~50-200ms — letting an attacker enumerate valid admin email
// addresses purely by measuring response latency, without ever guessing a
// correct password. Comparing against this fixed dummy hash whenever the
// email doesn't exist keeps response time constant either way.
const DUMMY_HASH = "$2a$10$ui48E8iXml5KjmjvlTSgZ.0L8e93KRDihxAZY0YHBVbTyv2i4KOnC";

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (isIpRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many login attempts. Please wait 15 minutes and try again." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { email, password } = parsed.data;

    const admin = await prisma.admin.findUnique({ where: { email } });

    // Always run bcrypt.compare — against the real hash if the admin exists,
    // or a fixed dummy hash if not — so response timing never reveals
    // whether the email is a valid admin account.
    const valid = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY_HASH);

    if (!admin || !valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Create session token
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
  } catch (err) {
    console.error("Login error:", err);
    await logAuthError(err, { route: "/api/auth/admin-login" });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}