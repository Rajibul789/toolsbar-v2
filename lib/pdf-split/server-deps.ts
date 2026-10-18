/**
 * lib/pdf-split/server-deps.ts — binds real dependencies for the route handlers.
 * Server-only.
 */
import { SITE_CONFIG } from "@/config/site.config";
import { createNodePipelineDeps } from "./node";
import { createMemoryRateLimiter, type ServerDeps } from "./server";
import { createSupabaseStorage, getBucketName, type SplitStorage } from "./storage";

let storage: SplitStorage | null | undefined;
let pipeline: ReturnType<typeof createNodePipelineDeps> | undefined;
const rateLimiter = createMemoryRateLimiter();

export function getServerDeps(): ServerDeps {
  if (storage === undefined) storage = createSupabaseStorage();
  let allowedHost: string | undefined;
  try {
    allowedHost = new URL(SITE_CONFIG.url).host;
  } catch { /* ignore */ }

  return {
    storage,
    pipeline: () => (pipeline ??= createNodePipelineDeps()),
    rateLimiter,
    newId: () => crypto.randomUUID(),
    now: () => Date.now(),
    allowedHosts: allowedHost ? [allowedHost] : [],
    publicConfig: () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      return supabaseUrl && anonKey ? { supabaseUrl, anonKey, bucket: getBucketName() } : null;
    },
  };
}