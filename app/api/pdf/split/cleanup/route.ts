import { handleCleanup } from "@/lib/pdf-split/server";
import { getServerDeps } from "@/lib/pdf-split/server-deps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Step 3: the browser has its files — delete everything stored for the job. */
export async function POST(req: Request) {
  return handleCleanup(req, getServerDeps());
}