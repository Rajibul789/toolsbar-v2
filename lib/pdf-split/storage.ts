/**
 * lib/pdf-split/storage.ts — temporary object storage for the server fallback.
 *
 * Vercel caps request AND response bodies at 4.5 MB, so a PDF can neither be
 * POSTed to a function nor returned from one. Instead the browser uploads
 * straight to a PRIVATE Supabase Storage bucket through a short-lived signed
 * upload URL, the function reads it from the bucket, writes the split pages
 * back, and the browser downloads them through signed URLs. Everything is
 * deleted as soon as it has been used (and swept after an hour if abandoned).
 */
import { createClient } from "@supabase/supabase-js";
import { MAX_PDF_BYTES } from "./types";

export interface StoredObject {
  path: string;
  /** epoch ms */
  createdAt: number;
}

export interface SplitStorage {
  createSignedUpload(path: string): Promise<{ path: string; token: string }>;
  download(path: string): Promise<Uint8Array>;
  upload(path: string, bytes: Uint8Array, contentType: string): Promise<void>;
  createSignedDownloadUrl(path: string, ttlSeconds: number): Promise<string>;
  remove(paths: string[]): Promise<void>;
  /** Every object under `prefix` (recursing into sub-folders). */
  list(prefix: string): Promise<StoredObject[]>;
}

export const DEFAULT_BUCKET = "pdf-split-temp";

/** The temp bucket is private; its name can be overridden with PDF_SPLIT_BUCKET. */
export function getBucketName(): string {
  return process.env.PDF_SPLIT_BUCKET?.trim() || DEFAULT_BUCKET;
}

/** Returns null when Supabase isn't configured — the fallback is then simply not offered. */
export function createSupabaseStorage(): SplitStorage | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const bucket = getBucketName();
  let ready: Promise<void> | null = null;

  const ensureBucket = () =>
    (ready ??= (async () => {
      const { data } = await client.storage.getBucket(bucket);
      if (data) return;
      const { error } = await client.storage.createBucket(bucket, {
        public: false,
        fileSizeLimit: MAX_PDF_BYTES,
        allowedMimeTypes: ["application/pdf"],
      });
      if (error && !/already exists/i.test(error.message)) {
        ready = null;
        throw new Error(`Could not create storage bucket "${bucket}": ${error.message}`);
      }
    })());

  const api = () => client.storage.from(bucket);

  async function listRecursive(prefix: string, out: StoredObject[]): Promise<void> {
    let offset = 0;
    for (;;) {
      const { data, error } = await api().list(prefix, { limit: 100, offset });
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) return;
      for (const item of data) {
        const full = `${prefix}/${item.name}`;
        if (item.id === null) await listRecursive(full, out); // a folder
        else out.push({ path: full, createdAt: Date.parse(item.created_at ?? "") || 0 });
      }
      if (data.length < 100) return;
      offset += 100;
    }
  }

  return {
    async createSignedUpload(path) {
      await ensureBucket();
      const { data, error } = await api().createSignedUploadUrl(path);
      if (error || !data) throw new Error(error?.message ?? "Could not create an upload URL.");
      return { path: data.path, token: data.token };
    },
    async download(path) {
      const { data, error } = await api().download(path);
      if (error || !data) throw new Error(error?.message ?? "Object not found.");
      return new Uint8Array(await data.arrayBuffer());
    },
    async upload(path, bytes, contentType) {
      const { error } = await api().upload(path, bytes, { contentType, upsert: true });
      if (error) throw new Error(error.message);
    },
    async createSignedDownloadUrl(path, ttlSeconds) {
      const { data, error } = await api().createSignedUrl(path, ttlSeconds);
      if (error || !data) throw new Error(error?.message ?? "Could not sign the download URL.");
      return data.signedUrl;
    },
    async remove(paths) {
      if (paths.length === 0) return;
      const { error } = await api().remove(paths);
      if (error) throw new Error(error.message);
    },
    async list(prefix) {
      const out: StoredObject[] = [];
      await listRecursive(prefix, out);
      return out;
    },
  };
}