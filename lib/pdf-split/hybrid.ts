/**
 * lib/pdf-split/hybrid.ts — browser-first processing with a consented server fallback.
 *
 *  - The browser pipeline always runs first. Nothing leaves the device.
 *  - The server is considered only when the browser pipeline FAILED
 *    (an engine crashed / ran out of memory, or some pages could not be
 *    extracted) — never for password problems, corrupt files or bad input,
 *    which the server's identical engines could not fix either.
 *  - Even then the file is uploaded only after the user explicitly agrees
 *    (`askConsent`). Declining returns whatever the browser managed.
 */
import {
  PdfSplitError,
  type PipelineResult,
  type SplitOptions,
} from "./types";
import type { ServerSplitClient } from "./client";

export type FallbackReason = "engine-failure" | "partial-failure";

export interface HybridDeps {
  runLocal(opts: SplitOptions): Promise<PipelineResult>;
  /** null when the deployment has no server fallback configured. */
  server: ServerSplitClient | null;
  /** Asked before offering the fallback: is server processing actually configured? */
  serverAvailable?: () => Promise<boolean>;
  /** Resolve true ONLY after the user has explicitly agreed to upload the file. */
  askConsent(reason: FallbackReason): Promise<boolean>;
  bytes: Uint8Array;
  fileName: string;
  onServerStatus?: (message: string) => void;
}

export interface HybridOutcome {
  source: "browser" | "server" | "browser+server";
  result: PipelineResult;
}

/** Errors the server could not fix: it runs the same engines on the same bytes. */
const FINAL_CODES = new Set(["PASSWORD_REQUIRED", "PASSWORD_INCORRECT", "UNREADABLE", "NO_PAGES", "NOT_A_PDF", "TOO_LARGE", "ABORTED"]);

export async function hybridSplit(deps: HybridDeps, opts: SplitOptions): Promise<HybridOutcome> {
  let local: PipelineResult | null = null;
  let localError: PdfSplitError | null = null;

  try {
    local = await deps.runLocal(opts);
  } catch (e) {
    localError =
      e instanceof PdfSplitError
        ? e
        : new PdfSplitError("ENGINE_FAILURE", "Your browser could not process this PDF.", { cause: e });
    if (FINAL_CODES.has(localError.code)) throw localError;
  }

  if (local && local.failed.length === 0) return { source: "browser", result: local };

  // ── The browser pipeline failed (entirely, or for some pages) ──────────────
  const reason: FallbackReason = local ? "partial-failure" : "engine-failure";
  const server = deps.server && (!deps.serverAvailable || (await deps.serverAvailable())) ? deps.server : null;
  if (!server) {
    if (local) return { source: "browser", result: local };
    throw localError!;
  }

  const agreed = await deps.askConsent(reason);
  if (!agreed) {
    if (local) return { source: "browser", result: local };
    throw new PdfSplitError("CONSENT_DECLINED", "The PDF could not be processed in your browser and it was not uploaded for server processing.", { cause: localError });
  }

  const serverResult = await server.split({
    bytes: deps.bytes,
    fileName: deps.fileName,
    pages: local ? local.failed : opts.pages,
    password: opts.password,
    onStatus: deps.onServerStatus,
  });

  if (!local) {
    // The page count was unknown when asking, so the server may have returned every
    // page: apply the user's selection now.
    const wanted = opts.pages ?? opts.select?.(serverResult.totalPages);
    const pages = wanted ? serverResult.pages.filter((p) => wanted.includes(p.pageNum)) : serverResult.pages;
    return { source: "server", result: { ...serverResult, pages } };
  }
  return {
    source: "browser+server",
    result: {
      totalPages: local.totalPages,
      pages: [...local.pages, ...serverResult.pages].sort((a, b) => a.pageNum - b.pageNum),
      failed: serverResult.failed,
    },
  };
}