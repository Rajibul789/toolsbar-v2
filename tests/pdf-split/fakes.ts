/** In-memory stand-ins for Supabase Storage and the HTTP layer. */
import { randomUUID } from "node:crypto";
import type { SplitStorage, StoredObject } from "../../lib/pdf-split/storage";
import { createMemoryRateLimiter, handleCleanup, handleCapabilities, handleInit, handleProcess, type ServerDeps } from "../../lib/pdf-split/server";
import type { Uploader, UploadSlot } from "../../lib/pdf-split/client";
import { deps as nodeDeps } from "./helpers";

export interface MemoryStorage extends SplitStorage {
  objects: Map<string, { bytes: Uint8Array; createdAt: number }>;
  clock: { now: number };
  /** What the browser's direct upload to the signed URL would do. */
  putViaSignedUpload(slot: { path: string }, bytes: Uint8Array): void;
}

export function memoryStorage(): MemoryStorage {
  const objects = new Map<string, { bytes: Uint8Array; createdAt: number }>();
  const clock = { now: Date.now() };
  return {
    objects,
    clock,
    async createSignedUpload(path) { return { path, token: `token:${path}` }; },
    putViaSignedUpload(slot, bytes) { objects.set(slot.path, { bytes, createdAt: clock.now }); },
    async download(path) {
      const o = objects.get(path);
      if (!o) throw new Error("Object not found");
      return o.bytes;
    },
    async upload(path, bytes) { objects.set(path, { bytes, createdAt: clock.now }); },
    async createSignedDownloadUrl(path, ttl) { return `memory://${path}?ttl=${ttl}`; },
    async remove(paths) { for (const p of paths) objects.delete(p); },
    async list(prefix): Promise<StoredObject[]> {
      return [...objects].filter(([p]) => p.startsWith(prefix + "/")).map(([path, o]) => ({ path, createdAt: o.createdAt }));
    },
  };
}

export function makeServerDeps(storage: MemoryStorage | null, over: Partial<ServerDeps> = {}): ServerDeps {
  return {
    storage,
    pipeline: () => nodeDeps,
    rateLimiter: createMemoryRateLimiter(),
    newId: randomUUID,
    now: () => storage?.clock.now ?? Date.now(),
    publicConfig: () => ({ supabaseUrl: "https://example.supabase.co", anonKey: "anon-key", bucket: "pdf-split-temp" }),
    ...over,
  };
}

export const SITE = "https://site.example";

export function post(url: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`${SITE}${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: SITE, host: "site.example", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

export async function readJson(res: Response): Promise<Record<string, any>> { // eslint-disable-line @typescript-eslint/no-explicit-any
  return (await res.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/** A fetch() that serves the real route handlers and the memory:// download URLs. */
export function routedFetch(deps: ServerDeps, storage: MemoryStorage, log: string[] = []): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith("memory://")) {
      const path = url.slice("memory://".length).split("?")[0];
      const o = storage.objects.get(path);
      return o ? new Response(o.bytes as BodyInit) : new Response("gone", { status: 404 });
    }
    const route = url.replace("/api/pdf/split/", "");
    log.push(route);
    const req = post(`/api/pdf/split/${route}`, init?.body as string);
    if (route === "init" && (init?.method ?? "GET") === "GET") return handleCapabilities(deps);
    if (route === "init") return handleInit(req, deps);
    if (route === "process") return handleProcess(req, deps);
    if (route === "cleanup") return handleCleanup(req, deps);
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
}

export const storageUploader = (storage: MemoryStorage, log: string[] = []): Uploader => async (slot: UploadSlot, bytes) => {
  log.push("upload");
  storage.putViaSignedUpload(slot, bytes);
};