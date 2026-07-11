/**
 * app/api/errors/report/route.ts
 *
 * POST /api/errors/report
 *
 * Receives an error report from the client Error Reveal Panel,
 * validates the payload, and persists it to the ErrorReport table.
 *
 * No authentication required — users are not logged in when they hit
 * an error page. Client-side rate limiting in reporter.ts prevents abuse.
 * Server-side validation + length caps prevent oversized payloads.
 *
 * Response:
 *   200 { success: true, id: string }
 *   400 { error: "Invalid input" }
 *   500 { error: "Failed to save report" }
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { logApiError } from "@/lib/errors/logger";

// ─── IP-based server rate limiting ───────────────────────────────────────────
// The client-side protection in reporter.ts (localStorage, 5/hour) is trivially
// bypassed by calling this endpoint directly — it offers no real protection on
// its own. This mirrors the same server-side safeguard already used in the
// sibling /api/errors/log route, so both DB-writing error endpoints have
// equivalent defense-in-depth against flood/DB-bloat abuse.
const IP_MAP    = new Map<string, number[]>();
const IP_LIMIT  = 10;      // max 10 reports per IP per minute
const IP_WINDOW = 60_000;  // 1 minute

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

// ─── Validation schema ────────────────────────────────────────────────────────

const reportSchema = z.object({
  errorType:    z.string().max(200).default("UnknownError"),
  errorMessage: z.string().max(5000).default("Unknown error"),
  stackTrace:   z.string().max(20000).nullable().optional(),
  route:        z.string().max(500).nullable().optional(),
  toolSlug:     z.string().max(100).nullable().optional(),
  blogSlug:     z.string().max(100).nullable().optional(),
  browser:      z.string().max(200).nullable().optional(),
  device:       z.string().max(100).nullable().optional(),
  userId:       z.string().max(100).nullable().optional(),
  role:         z.string().max(50).nullable().optional(),
  // Explicit client-side timestamp — falls back to DB default if missing
  timestamp:    z.string().datetime().nullable().optional(),
});

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // IP rate limiting — real protection, unlike the client-side-only guard
  // this route previously relied on exclusively.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (isIpRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    // Parse and validate body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const d = parsed.data;

    // Persist to database
    const report = await prisma.errorReport.create({
      data: {
        errorType:    d.errorType,
        errorMessage: d.errorMessage,
        stackTrace:   d.stackTrace   ?? null,
        route:        d.route        ?? null,
        toolSlug:     d.toolSlug     ?? null,
        blogSlug:     d.blogSlug     ?? null,
        browser:      d.browser      ?? null,
        device:       d.device       ?? null,
        userId:       d.userId       ?? null,
        role:         d.role         ?? null,
        // Use client-provided timestamp if present, otherwise DB default applies
        ...(d.timestamp ? { timestamp: new Date(d.timestamp) } : {}),
      },
      select: { id: true },
    });

    return NextResponse.json({ success: true, id: report.id });

  } catch (err) {
    // Log server-side for debugging — never expose raw error to client
    console.error("[api/errors/report] Failed to save report:", err);
    await logApiError(err, { route: "/api/errors/report" });
    return NextResponse.json(
      { error: "Failed to save report" },
      { status: 500 }
    );
  }
}