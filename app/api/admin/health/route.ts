/**
 * app/api/admin/health/route.ts
 *
 * GET — performs real-time health checks on all system layers:
 *   - Prisma ORM (can we run a query?)
 *   - PostgreSQL / Supabase database (response time)
 *   - Individual table access (BlogPost, Tool, SeoSetting)
 *   - Supabase REST API (if NEXT_PUBLIC_SUPABASE_URL is set)
 *   - Admin API layer (this route itself)
 *
 * Returns a structured { status, checks, timestamp } response.
 * Admin auth required.
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/db";
import { getAdminFromToken } from "@/lib/auth";

type CheckStatus = "success" | "warning" | "error";

interface HealthCheck {
  name:        string;
  status:      CheckStatus;
  message:     string;
  latencyMs?:  number;
  detail?:     string;
}

async function runCheck(
  name: string,
  fn: () => Promise<string | { message: string; detail?: string }>
): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const result = await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout after 5000ms")), 5000)
      ),
    ]);
    const latencyMs = Date.now() - start;
    const message = typeof result === "string" ? result : result.message;
    const detail  = typeof result === "string" ? undefined : result.detail;
    const status: CheckStatus = latencyMs > 2000 ? "warning" : "success";
    return { name, status, message, latencyMs, detail };
  } catch (err) {
    return {
      name,
      status: "error",
      message: err instanceof Error ? err.message : "Unknown error",
      latencyMs: Date.now() - start,
    };
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  const admin = await getAdminFromToken(token ?? "");
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [prismaCheck, dbCheck, blogCheck, toolCheck, settingCheck, supabaseCheck] =
    await Promise.all([
      // 1. Prisma ORM — can we instantiate and run a query?
      runCheck("Prisma ORM", async () => {
        await prisma.$queryRaw`SELECT 1 AS ping`;
        return "Prisma client connected and query executed";
      }),

      // 2. Database — response time on a lightweight query
      runCheck("Database (PostgreSQL)", async () => {
        const start = Date.now();
        await prisma.$queryRaw`SELECT NOW() AS ts, current_database() AS db`;
        const ms = Date.now() - start;
        return { message: `Connected — ${ms}ms query time`, detail: "Provider: PostgreSQL via Supabase" };
      }),

      // 3. BlogPost table — count check
      runCheck("BlogPost Table", async () => {
        const count = await prisma.blogPost.count();
        return { message: `Accessible — ${count} post${count !== 1 ? "s" : ""} in DB` };
      }),

      // 4. Tool table — count check
      runCheck("Tool Table", async () => {
        const count = await prisma.tool.count();
        return { message: `Accessible — ${count} tool${count !== 1 ? "s" : ""} in DB` };
      }),

      // 5. SeoSetting table (used for settings/maintenance)
      runCheck("Settings Table", async () => {
        const count = await prisma.seoSetting.count();
        return { message: `Accessible — ${count} setting${count !== 1 ? "s" : ""} stored` };
      }),

      // 6. Supabase REST API (via NEXT_PUBLIC_SUPABASE_URL env var)
      runCheck("Supabase API", async () => {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (!url) return { message: "NEXT_PUBLIC_SUPABASE_URL not set", detail: "Add it to .env.local" };
        const res = await fetch(`${url}/rest/v1/`, {
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""}`,
          },
          signal: AbortSignal.timeout(4000),
        });
        if (!res.ok) return { message: `HTTP ${res.status} from Supabase REST API` };
        return { message: "Supabase REST API reachable", detail: url.replace(/https?:\/\//, "").split(".")[0] + ".supabase.co" };
      }),
    ]);

  const checks: HealthCheck[] = [
    prismaCheck, dbCheck, blogCheck, toolCheck, settingCheck, supabaseCheck,
    // 7. Admin API itself — always success if we get here
    {
      name: "Admin API Layer",
      status: "success",
      message: `Authenticated as ${admin.email}`,
      latencyMs: 0,
    },
  ];

  const hasError   = checks.some((c) => c.status === "error");
  const hasWarning = checks.some((c) => c.status === "warning");
  const overallStatus: CheckStatus = hasError ? "error" : hasWarning ? "warning" : "success";

  return NextResponse.json({
    status:    overallStatus,
    checks,
    timestamp: new Date().toISOString(),
    provider:  "PostgreSQL (Supabase)",
    prismaVersion: "5.x",
  });
}