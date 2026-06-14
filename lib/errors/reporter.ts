/**
 * lib/errors/reporter.ts
 *
 * Client-side error report utility.
 *
 * Sends error reports to POST /api/errors/report.
 * Handles:
 *   - Browser/device auto-detection
 *   - Tool slug / blog slug extraction from URL
 *   - Client-side rate limiting (max 5 reports per hour per client)
 *   - Deduplication (same error+route won't be re-submitted within 5 min)
 *   - Network failure graceful degradation
 *
 * Used by:
 *   - lib/errors/error-panel.tsx  (Report Error button)
 *   - lib/errors/logger.ts        (Part 5 — automatic logging)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ErrorReportPayload {
  errorType:     string;
  errorMessage:  string;
  stackTrace?:   string | null;
  route?:        string | null;
  toolSlug?:     string | null;
  blogSlug?:     string | null;
  userId?:       string | null;
  role?:         string | null;
  /** ISO timestamp of when the error occurred — defaults to now() if omitted */
  timestamp?:    string | null;
}

export interface ReportResult {
  success: true;
  id:      string;
}

// ─── Rate limiting (localStorage-backed) ─────────────────────────────────────

const RATE_KEY   = "toolsbar_err_reports";
const DEDUP_KEY  = "toolsbar_err_dedup";
const MAX_PER_HR = 5;
const HOUR_MS    = 60 * 60 * 1000;
const DEDUP_MS   = 5 * 60 * 1000; // 5 minutes

function isRateLimited(): boolean {
  try {
    const raw      = localStorage.getItem(RATE_KEY);
    const times: number[] = raw ? JSON.parse(raw) : [];
    const now      = Date.now();
    const recent   = times.filter((t) => now - t < HOUR_MS);
    if (recent.length >= MAX_PER_HR) return true;
    recent.push(now);
    localStorage.setItem(RATE_KEY, JSON.stringify(recent));
    return false;
  } catch {
    return false; // If localStorage is unavailable, allow the report
  }
}

function isDuplicate(errorType: string, route: string): boolean {
  try {
    const key     = `${errorType}::${route}`;
    const raw     = localStorage.getItem(DEDUP_KEY);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    const lastAt  = map[key];
    const now     = Date.now();
    if (lastAt && now - lastAt < DEDUP_MS) return true;
    map[key]      = now;
    // Prune old entries to keep localStorage tidy
    const pruned  = Object.fromEntries(
      Object.entries(map).filter(([, t]) => now - t < DEDUP_MS * 2)
    );
    localStorage.setItem(DEDUP_KEY, JSON.stringify(pruned));
    return false;
  } catch {
    return false;
  }
}

// ─── Browser / Device detection ───────────────────────────────────────────────

function detectBrowser(): string {
  if (typeof navigator === "undefined") return "Server";
  const ua = navigator.userAgent;
  if (ua.includes("Firefox/"))
    return `Firefox ${ua.match(/Firefox\/([\d.]+)/)?.[1] ?? ""}`;
  if (ua.includes("Edg/"))
    return `Edge ${ua.match(/Edg\/([\d.]+)/)?.[1] ?? ""}`;
  if (ua.includes("Chrome/"))
    return `Chrome ${ua.match(/Chrome\/([\d.]+)/)?.[1] ?? ""}`;
  if (ua.includes("Safari/") && !ua.includes("Chrome"))
    return `Safari ${ua.match(/Version\/([\d.]+)/)?.[1] ?? ""}`;
  return ua.slice(0, 80);
}

function detectDevice(): string {
  if (typeof navigator === "undefined") return "Server";
  const ua = navigator.userAgent;
  if (/Android/i.test(ua))   return "Android";
  if (/iPhone/i.test(ua))    return "iPhone";
  if (/iPad/i.test(ua))      return "iPad";
  if (/Macintosh/i.test(ua)) return "macOS";
  if (/Windows/i.test(ua))   return "Windows";
  if (/Linux/i.test(ua))     return "Linux";
  return navigator.platform ?? "Unknown";
}

// ─── Slug extraction ──────────────────────────────────────────────────────────

function extractSlugs(route: string): { toolSlug: string | null; blogSlug: string | null } {
  return {
    toolSlug: route.match(/^\/tools\/([^/?#]+)/)?.[1]  ?? null,
    blogSlug: route.match(/^\/blog\/([^/?#]+)/)?.[1]   ?? null,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * reportError — submit an error report to the database.
 *
 * Returns { success: true, id } on success, null on rate-limit / failure.
 *
 * @example
 *   const result = await reportError({
 *     errorType: error.name,
 *     errorMessage: error.message,
 *     stackTrace: error.stack,
 *   });
 *   if (result) console.log("Report ID:", result.id);
 */
export async function reportError(
  payload: ErrorReportPayload
): Promise<ReportResult | null> {
  const route = payload.route
    ?? (typeof window !== "undefined" ? window.location.pathname : "/");

  // Client-side guards
  if (isRateLimited()) {
    console.warn("[reporter] Rate limit reached — skipping report");
    return null;
  }
  if (isDuplicate(payload.errorType, route)) {
    console.warn("[reporter] Duplicate error suppressed — already reported within 5 min");
    return null;
  }

  const { toolSlug: autoTool, blogSlug: autoBlog } = extractSlugs(route);

  const body = {
    errorType:    payload.errorType    || "UnknownError",
    errorMessage: payload.errorMessage || "Unknown error",
    stackTrace:   payload.stackTrace   ?? null,
    route,
    toolSlug:     payload.toolSlug     ?? autoTool,
    blogSlug:     payload.blogSlug     ?? autoBlog,
    browser:      detectBrowser(),
    device:       detectDevice(),
    userId:       payload.userId       ?? null,
    role:         payload.role         ?? null,
    timestamp:    payload.timestamp    ?? new Date().toISOString(),
  };

  try {
    const res = await fetch("/api/errors/report", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[reporter] API ${res.status}:`, text);
      return null;
    }

    const data = (await res.json()) as { id: string };
    return { success: true, id: data.id };

  } catch (err) {
    console.error("[reporter] Network error:", err);
    return null;
  }
}
