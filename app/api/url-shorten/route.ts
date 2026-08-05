import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SITE_CONFIG } from "@/config/site.config";
import { logApiError } from "@/lib/errors/logger";

// ─── IP-based server rate limiting ───────────────────────────────────────────
// This route proxies every request to an external third-party service (a
// Cloudflare Worker) with no cap at all. A flood of requests here doesn't just
// cost this server — it consumes that external service's quota. Same bounded
// in-memory pattern used for the error-reporting endpoints, with a higher
// per-minute allowance appropriate for someone legitimately shortening
// several links in one session.
const IP_MAP    = new Map<string, number[]>();
const IP_LIMIT  = 20;      // max 20 requests per IP per minute
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

const schema = z.object({
  url: z.string().url(),
});

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (isIpRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests — please wait a moment." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const { url } = parsed.data;
    const workerUrl = SITE_CONFIG.services.urlShortener;

    const response = await fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(10_000),
    });

    // Read as text first — always safe, regardless of what the Worker sends.
    // A lot of small/hobby Cloudflare Workers return the shortened link as
    // plain text rather than JSON; calling response.json() directly on that
    // throws before we ever see what actually came back.
    const raw = await response.text();

    if (!response.ok) {
      console.error(`URL shortener: Worker returned ${response.status}. Body:`, raw.slice(0, 500));
      await logApiError(new Error(`Worker responded ${response.status}: ${raw.slice(0, 300)}`), {
        route: "/api/url-shorten", toolSlug: "url-shortener",
      });
      return NextResponse.json({ error: "Shortening service unavailable" }, { status: 502 });
    }

    const short = extractShortUrl(raw);

    if (!short) {
      // The Worker responded 200 OK, but not in any shape we recognize.
      // Log the exact raw body so the real shape is visible in the terminal
      // and in /admin/error-center — this is what tells us how to adjust
      // extractShortUrl() below, instead of guessing blind.
      console.error("URL shortener: unrecognized Worker response shape:", raw.slice(0, 500));
      await logApiError(new Error(`Unrecognized Worker response: ${raw.slice(0, 300)}`), {
        route: "/api/url-shorten", toolSlug: "url-shortener",
      });
      return NextResponse.json({ error: "Shortening service returned an unexpected response" }, { status: 502 });
    }

    return NextResponse.json({ short, original: url });
  } catch (err) {
    console.error("URL shortener error:", err);
    await logApiError(err, { route: "/api/url-shorten", toolSlug: "url-shortener" });
    return NextResponse.json({ error: "Failed to shorten URL" }, { status: 500 });
  }
}

/**
 * Pull a short URL out of a Cloudflare Worker response, whatever shape it's
 * in. Tries, in order:
 *   1. JSON with one of the common field names a URL-shortener Worker uses
 *   2. The raw body itself, if it's already a bare URL (plain-text Workers)
 * Returns null if nothing usable was found.
 */
function extractShortUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const json = JSON.parse(trimmed);
    if (json && typeof json === "object") {
      const candidate =
        json.short ?? json.shortUrl ?? json.short_url ??
        json.shortenedUrl ?? json.url ?? json.result ?? json.link;
      if (typeof candidate === "string" && /^https?:\/\//i.test(candidate)) {
        return candidate;
      }
    }
  } catch {
    // Not JSON — fall through to plain-text handling below.
  }

  // Plain-text Worker: the whole body is the short link itself.
  if (/^https?:\/\/\S+$/i.test(trimmed)) {
    return trimmed;
  }

  return null;
}