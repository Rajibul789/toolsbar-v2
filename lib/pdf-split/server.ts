/**
 * lib/pdf-split/server.ts — request handlers for the server-side fallback.
 *
 * Plain Request -> Response functions with injected dependencies, so they can
 * be exercised in tests without Next.js, Supabase or a network. The route
 * files under app/api/pdf/split/ are thin wrappers that bind real dependencies.
 *
 * Flow (all JSON, all small — nothing near Vercel's 4.5 MB body limit):
 *   POST /init     -> signed upload slot in a private bucket
 *   (browser uploads the PDF directly to storage)
 *   POST /process  -> download, split, write pages back, delete the source,
 *                     return signed download URLs
 *   POST /cleanup  -> delete everything for a job after the browser has the files
 */
import { PdfSplitError, MAX_PDF_BYTES, type PdfSplitErrorCode } from "./types";
import { splitPdf, type PipelineDeps } from "./pipeline";
import type { SplitStorage } from "./storage";

export const JOB_PREFIX = "jobs";
export const DOWNLOAD_TTL_SECONDS = 600;
export const ABANDONED_AFTER_MS = 60 * 60 * 1000;
const MAX_PAGES_PER_REQUEST = 10_000;
const MAX_PASSWORD_LENGTH = 256;
const JOB_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface RateLimiter {
  /** Returns 0 if allowed, otherwise the seconds to wait. */
  hit(key: string, limit: number, windowMs: number): number;
}

/** Best-effort in-memory limiter (per server instance). A shared store is needed for hard guarantees. */
export function createMemoryRateLimiter(now: () => number = Date.now): RateLimiter {
  const hits = new Map<string, number[]>();
  return {
    hit(key, limit, windowMs) {
      const t = now();
      const recent = (hits.get(key) ?? []).filter((x) => t - x < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return Math.max(1, Math.ceil((windowMs - (t - recent[0])) / 1000));
      }
      recent.push(t);
      hits.set(key, recent);
      if (hits.size > 5000) for (const [k, v] of hits) if (t - v[v.length - 1] > windowMs) hits.delete(k);
      return 0;
    },
  };
}

export interface ServerDeps {
  /** null = server processing not configured (Supabase env missing). */
  storage: SplitStorage | null;
  pipeline: () => PipelineDeps;
  rateLimiter: RateLimiter;
  newId: () => string;
  now: () => number;
  /** Values the browser needs to use its signed upload token (both are public by design). */
  publicConfig: () => { supabaseUrl: string; anonKey: string; bucket: string } | null;
  /** Optional extra allowed origin hosts (besides the request's own host). */
  allowedHosts?: string[];
}

function json(status: number, body: unknown, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
  });
}

function fail(status: number, code: PdfSplitErrorCode | "BAD_REQUEST" | "FORBIDDEN" | "RATE_LIMITED" | "NOT_FOUND", message: string, headers?: Record<string, string>) {
  return json(status, { error: { code, message } }, headers);
}

function clientKey(req: Request): string {
  return (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "unknown").trim();
}

/** Browsers always send Origin on POST; it must belong to this site. */
function originAllowed(req: Request, deps: ServerDeps): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }
  const own = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
  return host === own || (deps.allowedHosts ?? []).includes(host);
}

async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const text = await req.text();
    if (text.length > 100_000) return null;
    const body = JSON.parse(text);
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function gate(req: Request, deps: ServerDeps, action: string, limit: number): Response | null {
  if (!originAllowed(req, deps)) return fail(403, "FORBIDDEN", "Cross-site requests are not allowed.");
  if (!deps.storage) return fail(501, "SERVER_UNAVAILABLE", "Server-side processing is not configured on this deployment.");
  const wait = deps.rateLimiter.hit(`${action}:${clientKey(req)}`, limit, 60 * 60 * 1000);
  if (wait > 0) return fail(429, "RATE_LIMITED", "Too many requests. Please try again later.", { "retry-after": String(wait) });
  return null;
}

/** Removes objects nobody collected. Runs opportunistically on /init; never throws. */
export async function sweepAbandoned(storage: SplitStorage, now: number, maxAgeMs = ABANDONED_AFTER_MS): Promise<number> {
  try {
    const old = (await storage.list(JOB_PREFIX)).filter((o) => now - o.createdAt > maxAgeMs).slice(0, 200);
    await storage.remove(old.map((o) => o.path));
    return old.length;
  } catch {
    return 0;
  }
}

// ── GET /init (capability probe) ─────────────────────────────────────────────
/** Lets the browser know — before asking for consent — whether the fallback exists at all. */
export function handleCapabilities(deps: ServerDeps): Response {
  return json(200, { serverFallback: !!deps.storage && !!deps.publicConfig() });
}

// ── POST /init ───────────────────────────────────────────────────────────────
export async function handleInit(req: Request, deps: ServerDeps): Promise<Response> {
  const blocked = gate(req, deps, "init", 10);
  if (blocked) return blocked;
  const body = await readJson(req);
  const size = Number(body?.size);
  if (!Number.isInteger(size) || size < 1) return fail(400, "BAD_REQUEST", "A valid file size is required.");
  if (size > MAX_PDF_BYTES) return fail(413, "TOO_LARGE", "PDFs up to 50 MB are supported.");

  const storage = deps.storage!;
  const cfg = deps.publicConfig();
  if (!cfg) return fail(501, "SERVER_UNAVAILABLE", "Server-side processing is not configured on this deployment.");

  void sweepAbandoned(storage, deps.now());
  const jobId = deps.newId();
  try {
    const slot = await storage.createSignedUpload(`${JOB_PREFIX}/${jobId}/source.pdf`);
    return json(200, { jobId, bucket: cfg.bucket, path: slot.path, token: slot.token, supabaseUrl: cfg.supabaseUrl, anonKey: cfg.anonKey });
  } catch {
    return fail(500, "SERVER_FAILED", "Could not prepare the upload.");
  }
}

// ── POST /process ────────────────────────────────────────────────────────────
export async function handleProcess(req: Request, deps: ServerDeps): Promise<Response> {
  const blocked = gate(req, deps, "process", 20);
  if (blocked) return blocked;
  const body = await readJson(req);
  const jobId = typeof body?.jobId === "string" ? body.jobId : "";
  if (!JOB_ID.test(jobId)) return fail(400, "BAD_REQUEST", "Invalid job id.");

  let pages: number[] | undefined;
  if (body?.pages !== undefined) {
    if (!Array.isArray(body.pages) || body.pages.length === 0 || body.pages.length > MAX_PAGES_PER_REQUEST || !body.pages.every((n) => Number.isInteger(n) && n >= 1 && n <= 1_000_000)) {
      return fail(400, "BAD_REQUEST", "Invalid page selection.");
    }
    pages = body.pages as number[];
  }
  const password = typeof body?.password === "string" ? body.password : undefined;
  if (password !== undefined && password.length > MAX_PASSWORD_LENGTH) return fail(400, "BAD_REQUEST", "Invalid password.");

  const storage = deps.storage!;
  // The object path is derived from the validated job id — never taken from the client.
  const sourcePath = `${JOB_PREFIX}/${jobId}/source.pdf`;
  const removeJob = async () => {
    try {
      await storage.remove((await storage.list(`${JOB_PREFIX}/${jobId}`)).map((o) => o.path));
    } catch { /* best effort */ }
  };

  let bytes: Uint8Array;
  try {
    bytes = await storage.download(sourcePath);
  } catch {
    return fail(404, "NOT_FOUND", "The uploaded file was not found (it may have expired). Please try again.");
  }
  if (bytes.length > MAX_PDF_BYTES) { await removeJob(); return fail(413, "TOO_LARGE", "PDFs up to 50 MB are supported."); }
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 1024));
  if (!head.includes("%PDF-")) { await removeJob(); return fail(415, "NOT_A_PDF", "That file is not a PDF."); }

  try {
    const result = await splitPdf(bytes, { pages, password }, deps.pipeline());

    const results: Array<{ pageNum: number; name: string; size: number; engine: string; textPreserved: boolean; url: string }> = [];
    for (const page of result.pages) {
      const name = `page_${String(page.pageNum).padStart(3, "0")}.pdf`;
      const path = `${JOB_PREFIX}/${jobId}/out/${name}`;
      await storage.upload(path, page.bytes, "application/pdf");
      results.push({
        pageNum: page.pageNum, name, size: page.bytes.length, engine: page.engine, textPreserved: page.textPreserved,
        url: await storage.createSignedDownloadUrl(path, DOWNLOAD_TTL_SECONDS),
      });
    }
    await storage.remove([sourcePath]); // the original is no longer needed
    return json(200, { jobId, totalPages: result.totalPages, failed: result.failed, results, expiresInSeconds: DOWNLOAD_TTL_SECONDS });
  } catch (e) {
    if (e instanceof PdfSplitError) {
      // Password errors keep the upload so the browser can retry without uploading again.
      if (e.code !== "PASSWORD_REQUIRED" && e.code !== "PASSWORD_INCORRECT") await removeJob();
      const status = e.code === "PASSWORD_REQUIRED" || e.code === "PASSWORD_INCORRECT" ? 422 : e.code === "ENGINE_FAILURE" ? 500 : 422;
      return fail(status, e.code, e.message);
    }
    await removeJob();
    return fail(500, "SERVER_FAILED", "The server could not process this PDF.");
  }
}

// ── POST /cleanup ────────────────────────────────────────────────────────────
export async function handleCleanup(req: Request, deps: ServerDeps): Promise<Response> {
  const blocked = gate(req, deps, "cleanup", 60);
  if (blocked) return blocked;
  const body = await readJson(req);
  const jobId = typeof body?.jobId === "string" ? body.jobId : "";
  if (!JOB_ID.test(jobId)) return fail(400, "BAD_REQUEST", "Invalid job id.");
  const storage = deps.storage!;
  try {
    const objects = await storage.list(`${JOB_PREFIX}/${jobId}`);
    await storage.remove(objects.map((o) => o.path));
    return json(200, { removed: objects.length });
  } catch {
    return fail(500, "SERVER_FAILED", "Cleanup failed.");
  }
}