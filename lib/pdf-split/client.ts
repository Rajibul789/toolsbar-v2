/**
 * lib/pdf-split/client.ts — browser client for the server fallback.
 *
 * init -> direct upload to private storage -> process -> download -> cleanup.
 * Only ever called after the user has explicitly agreed to the upload.
 */
import { PdfSplitError, type PdfSplitErrorCode, type PipelineResult, type SplitPage, type EngineId } from "./types";

export interface ServerSplitArgs {
  bytes: Uint8Array;
  fileName: string;
  pages?: number[];
  password?: string;
  onStatus?: (message: string) => void;
}

export interface ServerSplitClient {
  split(args: ServerSplitArgs): Promise<PipelineResult>;
}

export interface UploadSlot {
  jobId: string;
  bucket: string;
  path: string;
  token: string;
  supabaseUrl: string;
  anonKey: string;
}

export type Uploader = (slot: UploadSlot, bytes: Uint8Array) => Promise<void>;

const defaultUploader: Uploader = async (slot, bytes) => {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(slot.supabaseUrl, slot.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await sb.storage
    .from(slot.bucket)
    .uploadToSignedUrl(slot.path, slot.token, new Blob([bytes as BlobPart], { type: "application/pdf" }), {
      contentType: "application/pdf",
    });
  if (error) throw new PdfSplitError("SERVER_FAILED", "The upload failed. Please try again.", { cause: error });
};

async function readError(res: Response): Promise<PdfSplitError> {
  let code: PdfSplitErrorCode = res.status === 501 ? "SERVER_UNAVAILABLE" : "SERVER_FAILED";
  let message = "Server-side processing failed.";
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string } };
    if (body.error?.code) code = body.error.code as PdfSplitErrorCode;
    if (body.error?.message) message = body.error.message;
  } catch { /* keep defaults */ }
  return new PdfSplitError(code, message);
}

export function createHttpServerClient(
  opts: { fetchImpl?: typeof fetch; uploader?: Uploader; basePath?: string } = {}
): ServerSplitClient {
  const doFetch = opts.fetchImpl ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  const upload = opts.uploader ?? defaultUploader;
  const base = opts.basePath ?? "/api/pdf/split";
  const post = (path: string, body: unknown) =>
    doFetch(`${base}/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

  return {
    async split({ bytes, pages, password, onStatus }) {
      onStatus?.("Preparing a secure upload…");
      const initRes = await post("init", { size: bytes.length });
      if (!initRes.ok) throw await readError(initRes);
      const slot = (await initRes.json()) as UploadSlot;

      let cleaned = false;
      const cleanup = async () => {
        if (cleaned) return;
        cleaned = true;
        try { await post("cleanup", { jobId: slot.jobId }); } catch { /* best effort — the server also sweeps old jobs */ }
      };

      try {
        onStatus?.("Uploading…");
        await upload(slot, bytes);

        onStatus?.("Processing on the server…");
        const procRes = await post("process", { jobId: slot.jobId, pages, password });
        if (!procRes.ok) {
          const err = await readError(procRes);
          // Password errors keep the upload on the server so a retry needs no re-upload;
          // everything else is final, so clean up now.
          if (err.code !== "PASSWORD_REQUIRED" && err.code !== "PASSWORD_INCORRECT") await cleanup();
          throw err;
        }
        const data = (await procRes.json()) as {
          totalPages: number;
          failed: number[];
          results: Array<{ pageNum: number; engine: EngineId; textPreserved: boolean; url: string }>;
        };

        onStatus?.("Downloading results…");
        const out: SplitPage[] = [];
        for (const r of data.results) {
          const res = await doFetch(r.url);
          if (!res.ok) throw new PdfSplitError("SERVER_FAILED", "Could not download a processed page.");
          out.push({ pageNum: r.pageNum, bytes: new Uint8Array(await res.arrayBuffer()), engine: r.engine, textPreserved: r.textPreserved });
        }
        await cleanup();
        return { totalPages: data.totalPages, pages: out.sort((a, b) => a.pageNum - b.pageNum), failed: data.failed };
      } catch (e) {
        if (e instanceof PdfSplitError && (e.code === "PASSWORD_REQUIRED" || e.code === "PASSWORD_INCORRECT")) throw e;
        await cleanup();
        throw e instanceof PdfSplitError ? e : new PdfSplitError("SERVER_FAILED", "Server-side processing failed.", { cause: e });
      }
    },
  };
}