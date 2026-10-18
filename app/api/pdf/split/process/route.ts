import { handleProcess } from "@/lib/pdf-split/server";
import { getServerDeps } from "@/lib/pdf-split/server-deps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Kept at 60 s so it is valid on every Vercel plan; raise it if you have a higher limit. */
export const maxDuration = 60;

/** Step 2: split the uploaded PDF (same pipeline as the browser) and return signed download URLs. */
export async function POST(req: Request) {
  return handleProcess(req, getServerDeps());
}