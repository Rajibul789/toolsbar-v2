/**
 * lib/errors/logger.ts
 *
 * SERVER-SIDE ONLY — do not import in "use client" components.
 *
 * Centralized error logging utility for ToolsBar v2.
 * Writes to the ErrorLog Prisma model automatically.
 *
 * Features:
 *   ✔ Stack trace parsing → extracts fileName + functionName
 *   ✔ In-memory rate limiting (max 1 log per fingerprint per 60s)
 *   ✔ Auto-cleanup of rate limit map (prevents memory leaks)
 *   ✔ Production-safe — catches its own errors, never crashes the host
 *   ✔ Supports future monitoring integrations (Sentry, Datadog, etc.)
 *
 * Usage:
 *   // In API Route Handlers:
 *   import { logError } from "@/lib/errors/logger";
 *   catch (err) { await logError({ errorType: "ApiError", message: String(err), route: "/api/pdf/split" }); }
 *
 *   // With helper (shorter):
 *   import { logApiError } from "@/lib/errors/logger";
 *   catch (err) { await logApiError(err, { route: "/api/pdf/split", toolSlug: "pdf-split" }); }
 */

import prisma from "@/lib/db";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ErrorLogPayload {
  errorType:      string;
  message:        string;
  stackTrace?:    string | null;
  fileName?:      string | null;
  functionName?:  string | null;
  componentName?: string | null;
  route?:         string | null;
  toolSlug?:      string | null;
  blogSlug?:      string | null;
  userId?:        string | null;
  role?:          string | null;
  browser?:       string | null;
  device?:        string | null;
  environment?:   string | null;
}

// ─── Rate limiting ────────────────────────────────────────────────────────────
// In-memory map: fingerprint → last log timestamp (ms)
// Prevents log spam for the same error repeatedly hitting the same route.
// Note: resets on server restart. For distributed deployments, extend with Redis.

const RATE_MAP     = new Map<string, number>();
const RATE_LIMIT_MS = 60_000; // 60 seconds per fingerprint
const MAX_MAP_SIZE  = 500;    // cap map size to prevent memory leaks

function getFingerprint(payload: ErrorLogPayload): string {
  return [
    payload.errorType ?? "unknown",
    payload.route     ?? "unknown",
    payload.fileName  ?? "unknown",
  ].join("::");
}

function isRateLimited(fingerprint: string): boolean {
  const now  = Date.now();
  const last = RATE_MAP.get(fingerprint);

  if (last !== undefined && now - last < RATE_LIMIT_MS) {
    return true; // same error logged recently — skip
  }

  // Record this log
  RATE_MAP.set(fingerprint, now);

  // Prune stale entries when map grows too large
  if (RATE_MAP.size > MAX_MAP_SIZE) {
    for (const [key, ts] of RATE_MAP.entries()) {
      if (now - ts > RATE_LIMIT_MS * 2) {
        RATE_MAP.delete(key);
      }
    }
  }

  return false;
}

// ─── Stack trace parser ───────────────────────────────────────────────────────

interface ParsedFrame {
  functionName: string;
  fileName:     string;
  line:         string;
}

function parseFirstAppFrame(stack: string): ParsedFrame | null {
  if (!stack) return null;

  const lines = stack.split("\n").slice(1); // skip "Error: message" line

  for (const line of lines) {
    // Skip internal/node_modules frames
    if (
      line.includes("node_modules") ||
      line.includes("webpack-internal") ||
      line.includes("node:internal") ||
      line.includes("at process.") ||
      line.includes("at async Promise") ||
      line.includes("next/dist")
    ) continue;

    // "at functionName (file:line:col)"
    const withFn = line.match(/^\s*at (.+?) \((.+?):(\d+):\d+\)/);
    if (withFn) {
      return {
        functionName: withFn[1].trim(),
        fileName:     cleanFilePath(withFn[2]),
        line:         withFn[3],
      };
    }

    // "at file:line:col"
    const noFn = line.match(/^\s*at (.+?):(\d+):\d+/);
    if (noFn) {
      return {
        functionName: "<anonymous>",
        fileName:     cleanFilePath(noFn[1]),
        line:         noFn[2],
      };
    }
  }

  return null;
}

function cleanFilePath(raw: string): string {
  return raw
    .replace(/webpack-internal:\/\/\//, "")
    .replace(/.*workspaces\/[^/]+\//, "")
    .replace(/.*\/\.next\//, ".next/")
    .replace(/\?.*$/, "")
    .trim();
}

// ─── Core logError ────────────────────────────────────────────────────────────

/**
 * logError — write an entry to the ErrorLog table.
 *
 * Production-safe: catches its own errors and logs them to console only,
 * so a logger failure never crashes the host operation.
 *
 * Returns the created log ID on success, null on skip/failure.
 */
export async function logError(payload: ErrorLogPayload): Promise<string | null> {
  try {
    // Rate limiting check
    const fingerprint = getFingerprint(payload);
    if (isRateLimited(fingerprint)) {
      return null; // silently skipped
    }

    // Parse stack for file/function if not provided
    let fileName     = payload.fileName     ?? null;
    let functionName = payload.functionName ?? null;

    if (payload.stackTrace && (!fileName || !functionName)) {
      const parsed = parseFirstAppFrame(payload.stackTrace);
      if (parsed) {
        fileName     = fileName     ?? parsed.fileName;
        functionName = functionName ?? parsed.functionName;
      }
    }

    const environment = payload.environment
      ?? process.env.NODE_ENV
      ?? "production";

    const log = await prisma.errorLog.create({
      data: {
        errorType:     payload.errorType,
        message:       payload.message,
        stackTrace:    payload.stackTrace    ?? null,
        fileName:      fileName,
        functionName:  functionName,
        componentName: payload.componentName ?? null,
        route:         payload.route         ?? null,
        toolSlug:      payload.toolSlug      ?? null,
        blogSlug:      payload.blogSlug      ?? null,
        userId:        payload.userId        ?? null,
        role:          payload.role          ?? null,
        browser:       payload.browser       ?? null,
        device:        payload.device        ?? null,
        environment,
      },
      select: { id: true },
    });

    return log.id;

  } catch (err) {
    // NEVER let the logger crash the host operation
    console.error("[logger] Failed to write ErrorLog:", err);
    return null;
  }
}

// ─── Convenience helpers ──────────────────────────────────────────────────────

/**
 * logApiError — shorthand for API Route Handlers.
 *
 * Extracts errorType and message from any thrown value automatically.
 *
 * Usage:
 *   catch (err) {
 *     await logApiError(err, { route: "/api/pdf/split", toolSlug: "pdf-split" });
 *   }
 */
export async function logApiError(
  err: unknown,
  context: Omit<ErrorLogPayload, "errorType" | "message" | "stackTrace">
): Promise<string | null> {
  const error  = err instanceof Error ? err : new Error(String(err));
  return logError({
    errorType:  error.name || "ApiError",
    message:    error.message,
    stackTrace: error.stack ?? null,
    ...context,
  });
}

/**
 * logAuthError — shorthand for authentication/authorization failures.
 */
export async function logAuthError(
  err: unknown,
  context: Omit<ErrorLogPayload, "errorType" | "message" | "stackTrace">
): Promise<string | null> {
  const error = err instanceof Error ? err : new Error(String(err));
  return logError({
    errorType:  "AuthError",
    message:    error.message,
    stackTrace: error.stack ?? null,
    ...context,
  });
}

/**
 * logPrismaError — shorthand for Prisma/database failures.
 */
export async function logPrismaError(
  err: unknown,
  context: Omit<ErrorLogPayload, "errorType" | "message" | "stackTrace">
): Promise<string | null> {
  const error = err instanceof Error ? err : new Error(String(err));
  return logError({
    errorType:  error.name.startsWith("Prisma") ? error.name : "PrismaError",
    message:    error.message,
    stackTrace: error.stack ?? null,
    ...context,
  });
}

/**
 * logSupabaseError — shorthand for Supabase storage/query failures.
 */
export async function logSupabaseError(
  err: unknown,
  context: Omit<ErrorLogPayload, "errorType" | "message" | "stackTrace">
): Promise<string | null> {
  const error = err instanceof Error ? err : new Error(String(err));
  return logError({
    errorType:  "SupabaseError",
    message:    error.message,
    stackTrace: error.stack ?? null,
    ...context,
  });
}