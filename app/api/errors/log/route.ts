/**
 * app/api/errors/log/route.ts
 *
 * POST /api/errors/log
 *
 * Client-to-server bridge for automatic error logging.
 * Called by:
 *   - app/error.tsx (route-level errors)
 *   - app/(admin|tools|blog|marketing)/error.tsx (group-level errors)
 *   - lib/errors/error-boundary.tsx (React render errors via componentDidCatch)
 *
 * Unlike /api/errors/report (user-submitted), this endpoint is called
 * automatically — no user action required. It feeds the ErrorLog table.
 *
 * No auth required — errors happen before auth is established.
 * Rate limiting is enforced server-side inside logger.ts (60s per fingerprint).
 * Server-side IP rate limiting (via X-Forwarded-For) prevents API abuse.
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logError } from "@/lib/errors/logger";

// ─── IP-based server rate limiting ───────────────────────────────────────────
// Secondary line of defense against flood attacks
const IP_MAP     = new Map<string, number[]>();
const IP_LIMIT   = 10;      // max 10 logs per IP per minute
const IP_WINDOW  = 60_000;  // 1 minute

function isIpRateLimited(ip: string): boolean {
  const now     = Date.now();
  const history = (IP_MAP.get(ip) ?? []).filter((t) => now - t < IP_WINDOW);
  if (history.length >= IP_LIMIT) return true;
  history.push(now);
  IP_MAP.set(ip, history);
  // Prune IP_MAP
  if (IP_MAP.size > 1000) {
    for (const [k, times] of IP_MAP.entries()) {
      if (times.every((t) => now - t >= IP_WINDOW)) IP_MAP.delete(k);
    }
  }
  return false;
}

// ─── Validation ───────────────────────────────────────────────────────────────

const logSchema = z.object({
  errorType:     z.string().max(200).default("UnknownError"),
  message:       z.string().max(5000).default("Unknown error"),
  stackTrace:    z.string().max(20000).nullable().optional(),
  componentName: z.string().max(200).nullable().optional(),
  route:         z.string().max(500).nullable().optional(),
  toolSlug:      z.string().max(100).nullable().optional(),
  blogSlug:      z.string().max(100).nullable().optional(),
  userId:        z.string().max(100).nullable().optional(),
  role:          z.string().max(50).nullable().optional(),
  browser:       z.string().max(200).nullable().optional(),
  device:        z.string().max(100).nullable().optional(),
});

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // IP rate limiting
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (isIpRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = logSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const d = parsed.data;

  const id = await logError({
    errorType:     d.errorType,
    message:       d.message,
    stackTrace:    d.stackTrace    ?? null,
    componentName: d.componentName ?? null,
    route:         d.route         ?? null,
    toolSlug:      d.toolSlug      ?? null,
    blogSlug:      d.blogSlug      ?? null,
    userId:        d.userId        ?? null,
    role:          d.role          ?? null,
    browser:       d.browser       ?? null,
    device:        d.device        ?? null,
  });

  if (id) {
    return NextResponse.json({ success: true, id });
  }

  // id is null when rate-limited or DB failed — still return 200 to client
  // (no need to surface logger failures to the app)
  return NextResponse.json({ success: true, id: null });
}